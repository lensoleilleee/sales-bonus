/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет прибыли от операции
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase;
  const remainder = 1 - purchase.discount / 100;
  return sale_price * quantity * remainder;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // функция для расчеа бонусов
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller; // почему в фигурных скобках -- данные о seller передаем объектом чтобы ф-ия могла опираться на другие факторы
  if (index === 0) {
    return seller.profit * 0.15;
  } else if (index === 1 || index === 2) {
    return seller.profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    return seller.profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }
  // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Чего-то не хватает");
  }

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("calculateRevenue и calculateBonus должны быть функциями");
  }

  //     const sellerIndex = new Map();
  //     sellers.forEach(s => {
  //         sellerIndex.set(s.id, {
  //         id: s.id,
  //         name: `${s.first_name} ${s.last_name}`,
  //         revenue: 0;
  //         profit: 0;
  //         sales_count: 0;
  //         products_sold: {}  // здесь будем накапливать продажи по артикулу
  //     });
  // });

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map(
    (seller) => ({
      id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {}, // здесь будем накапливать продажи по артикулу
    })
    // return sellerStats;  //?????????????????????
  );

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller])
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    // Увеличить количество продаж
    seller.sales_count++;
    // Увеличить общую сумму всех продаж
    seller.revenue += record.total_amount;
    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const cost = product.purchase_price * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const revenuWithDiscount = calculateRevenue(item, product);
      // Посчитать прибыль: выручка минус себестоимость
      const profit = revenuWithDiscount - cost;
      // Увеличить общую накопленную прибыль (profit) у продавца
      seller.profit += profit;
      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Вызовем функцию расчёта бонуса для каждого продавца в отсортированном массиве

  // Здесь посчитаем промежуточные данные и отсортируем продавцов
  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);
  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    const total = sellerStats.length;
    seller.bonus = calculateBonus(index, total, seller);
    const top = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    seller.top_products = top;
  });

  // Сформируем и вернём отчёт
  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Целое число, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}
