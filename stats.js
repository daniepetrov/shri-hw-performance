function quantile(arr, q) {
  const sorted = arr.sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (sorted[base + 1] !== undefined) {
    return Math.floor(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
  } else {
    return Math.floor(sorted[base]);
  }
}

function prepareData(result) {
  return result.data.map((item) => {
    item.date = item.timestamp.split('T')[0];

    return item;
  });
}

// показать значение метрики за несколько дней
function showMetricByPeriod(data, page, name, period) {
  const datesArr = getDatesArr(period);
  const arr = [];

  for (date of datesArr) {
    let sampleData = data
      .filter((item) => item.page == page && item.name == name && item.date == date)
      .map((item) => item.value);

    arr.push({
      page: page,
      name: name,
      p25: quantile(sampleData, 0.25),
      p50: quantile(sampleData, 0.5),
      p75: quantile(sampleData, 0.75),
      p95: quantile(sampleData, 0.95),
      hits: sampleData.length,
      date: date,
    });
  }

  return arr;
}

// Показать сессию пользователя
function showSession(data, page, reqId) {
  const requestMap = new Map();

  for (item of data) {
    if (!requestMap.has(item.requestId)) {
      requestMap.set(item.requestId, {
        metrics: { [item.name]: item.value },
        slices: {
          ...item.additional,
        },
      });
    } else {
      const currentMetric = requestMap.get(item.requestId).metrics[item.name];

      requestMap.set(item.requestId, {
        metrics: {
          ...requestMap.get(item.requestId).metrics,
          [item.name]: currentMetric ? currentMetric + item.value : item.value,
        },
        slices: {
          ...item.additional,
        },
      });
    }
  }

  const currSession = requestMap.get(reqId);
  return {
    page,
    reqId: reqId,
    ...currSession.metrics,
    ...currSession.slices,
  };
}

// Сравнить метрику в разных срезах
function compareMetric(data, page, name, slice) {
  let slicesValues = new Set();
  const arr = [];

  for (item of data) {
    slicesValues.add(item.additional[slice]);
  }

  for (sliceValue of slicesValues) {
    let sampleDataBySlice = data
      .filter(
        (item) => item.page == page && item.name == name && item.additional[slice] === sliceValue,
      )
      .map((item) => item.value);

    arr.push({
      page: page,
      name: name,
      p25: quantile(sampleDataBySlice, 0.25),
      p50: quantile(sampleDataBySlice, 0.5),
      p75: quantile(sampleDataBySlice, 0.75),
      p95: quantile(sampleDataBySlice, 0.95),
      hits: sampleDataBySlice.length,
      [slice]: sliceValue,
    });
  }

  return arr;
}

// Рассчитать метрику за выбранный день
function calcMetricByDate(data, page, name, date) {
  let sampleData = data
    .filter((item) => item.page == page && item.name == name && item.date == date)
    .map((item) => item.value);

  const obj = {
    page: page,
    name: name,
    p25: quantile(sampleData, 0.25),
    p50: quantile(sampleData, 0.5),
    p75: quantile(sampleData, 0.75),
    p95: quantile(sampleData, 0.95),
    hits: sampleData.length,
    date: date,
  };
  console.table({ obj });
}

fetch('https://shri.yandex/hw/stat/data?counterId=4BD58C49-CEE0-4B85-A7E1-C7FCCEA9C87A')
  .then((res) => res.json())
  .then((result) => {
    let data = prepareData(result);

    console.log('Получаем метрику по дате');
    calcMetricByDate(data, 'send test', 'TTFB', '2021-07-12');
    calcMetricByDate(data, 'send test', 'FCP', '2021-07-12');

    console.log('Сравниваем метрику по срезу "платформа"');
    showTable(compareMetric(data, 'send test', 'FCP', 'platform'));
    console.log('Сравниваем метрику по срезу "Окружение"');
    showTable(compareMetric(data, 'send test', 'TTFB', 'env'));

    console.log('Показать сессию пользователя');
    showTable(showSession(data, 'send test', '354774417729'));

    console.log('Показать значение метрики за несколько дней');
    showTable(showMetricByPeriod(data, 'send test', 'TTFB', ['2021-07-09', '2021-07-12']));

  });

// Helper functions

// Форматировать в виде таблицы
function showTable(args) {
  if (Array.isArray(args)) {
    console.table(args);
  } else {
    console.table([args]);
  }
}

// Получить массив с датами из массива с начальной датой и конечной
function getDatesArr(period) {
  if (period.length === 0) {
    throw new Error('Необходимо задать значения периода');
  }

  if (period.length > 2) {
    throw new Error('Период должен состоять из двух дат');
  }

  const [from, to = new Date().toISOString().split('T')[0]] = period;
  const cFrom = new Date(from);
  const cTo = new Date(to);

  let daysArr = [new Date(cFrom).toISOString().split('T')[0]];
  let tempDate = cFrom;

  while (tempDate < cTo) {
    tempDate.setUTCDate(tempDate.getUTCDate() + 1);
    daysArr.push(new Date(tempDate).toISOString().split('T')[0]);
  }

  return daysArr;
}
