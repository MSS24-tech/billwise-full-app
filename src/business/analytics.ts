import type { Customer, Product, Sale } from "../domain";

export function getCustomerInsights(
  customers: Customer[],
  sales: Sale[],
  currentDate: string,
) {
  const insights = customers.map((customer) => {
    const invoices = sales.filter((sale) => sale.customerId === customer.id);
    const lifetimeValue = invoices.reduce((sum, sale) => sum + sale.total, 0);
    const outstanding = invoices.reduce(
      (sum, sale) => sum + Math.max(0, sale.total - sale.paid),
      0,
    );
    const overdueInvoices = invoices
      .filter(
        (sale) => sale.due < currentDate && sale.total > sale.paid,
      )
      .sort((a, b) => a.due.localeCompare(b.due));
    const overdue = overdueInvoices.reduce(
      (sum, sale) => sum + Math.max(0, sale.total - sale.paid),
      0,
    );
    const lastPurchase = invoices.reduce<string | null>(
      (latest, sale) =>
        !latest || sale.date > latest ? sale.date : latest,
      null,
    );
    const segment =
      overdue > 0
        ? "Overdue"
        : invoices.length > 1
          ? "Repeat"
          : invoices.length === 1
            ? "New"
            : "No sales";

    return {
      customer,
      invoiceCount: invoices.length,
      lifetimeValue,
      averageInvoiceValue: invoices.length ? lifetimeValue / invoices.length : 0,
      outstanding,
      overdue,
      overdueInvoices,
      lastPurchase,
      segment,
    };
  });

  return {
    customers: insights,
    byCustomerId: new Map(insights.map((insight) => [insight.customer.id, insight])),
    lifetimeValue: insights.reduce((sum, insight) => sum + insight.lifetimeValue, 0),
    repeatCustomerCount: insights.filter((insight) => insight.invoiceCount > 1).length,
    overdueTotal: insights.reduce((sum, insight) => sum + insight.overdue, 0),
  };
}

export function getBasketAffinities(products: Product[], sales: Sale[]) {
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const productInvoiceCounts = new Map<string, number>();
  const pairCounts = new Map<
    string,
    { firstId: string; secondId: string; invoiceCount: number }
  >();

  for (const sale of sales) {
    const productIds = [...new Set(sale.lines.map((line) => line.productId))].sort();
    for (const productId of productIds) {
      productInvoiceCounts.set(
        productId,
        (productInvoiceCounts.get(productId) ?? 0) + 1,
      );
    }
    for (let first = 0; first < productIds.length; first += 1) {
      for (let second = first + 1; second < productIds.length; second += 1) {
        const firstId = productIds[first];
        const secondId = productIds[second];
        const key = `${firstId}\u0000${secondId}`;
        const pair = pairCounts.get(key);
        if (pair) pair.invoiceCount += 1;
        else pairCounts.set(key, { firstId, secondId, invoiceCount: 1 });
      }
    }
  }

  return [...pairCounts.values()]
    .map((pair) => {
      const firstFrequency = productInvoiceCounts.get(pair.firstId) ?? 0;
      const secondFrequency = productInvoiceCounts.get(pair.secondId) ?? 0;
      const anchorId =
        firstFrequency >= secondFrequency ? pair.firstId : pair.secondId;
      const otherId = anchorId === pair.firstId ? pair.secondId : pair.firstId;
      const anchorFrequency = productInvoiceCounts.get(anchorId) ?? 0;

      return {
        ...pair,
        firstName: productNames.get(pair.firstId) ?? pair.firstId,
        secondName: productNames.get(pair.secondId) ?? pair.secondId,
        anchorId,
        otherId,
        anchorName: productNames.get(anchorId) ?? anchorId,
        otherName: productNames.get(otherId) ?? otherId,
        anchorInvoiceCount: anchorFrequency,
        affinity: anchorFrequency
          ? Math.round((pair.invoiceCount / anchorFrequency) * 100)
          : 0,
      };
    })
    .sort(
      (a, b) =>
        b.invoiceCount - a.invoiceCount ||
        b.affinity - a.affinity ||
        a.firstName.localeCompare(b.firstName),
    )
    .slice(0, 5);
}

export function getSalesMetrics(sales: Sale[], currentDate: string) {
  const revenue = sales.reduce((total, sale) => total + sale.total, 0);
  const received = sales.reduce((total, sale) => total + sale.paid, 0);
  const outstanding = sales.reduce(
    (total, sale) => total + Math.max(0, sale.total - sale.paid),
    0,
  );
  const unitsSold = sales.reduce(
    (total, sale) =>
      total + sale.lines.reduce((quantity, line) => quantity + line.qty, 0),
    0,
  );
  const todaySales = sales.filter((sale) => sale.date === currentDate);
  const todayRevenue = todaySales.reduce((total, sale) => total + sale.total, 0);
  const todayGrossProfit = todaySales.reduce(
    (total, sale) =>
      total +
      sale.lines.reduce(
        (lineProfit, line) =>
          lineProfit +
          (line.rate / (1 + line.gst / 100) *
            (1 - Math.min(100, Math.max(0, sale.discount)) / 100) -
            line.cost) *
            line.qty,
        0,
      ),
    0,
  );
  const paymentFollowUp = sales
    .filter((sale) => sale.total > sale.paid)
    .sort((a, b) => b.total - b.paid - (a.total - a.paid))[0];

  return {
    revenue,
    received,
    outstanding,
    unitsSold,
    todaySales,
    todayRevenue,
    todayGrossProfit,
    paymentFollowUp,
  };
}

export function getRestockRecommendations(
  products: Product[],
  sales: Sale[],
  currentDate: string,
) {
  const endDate = new Date(`${currentDate}T00:00:00`);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29);
  const start = [
    startDate.getFullYear(),
    String(startDate.getMonth() + 1).padStart(2, "0"),
    String(startDate.getDate()).padStart(2, "0"),
  ].join("-");
  const recentUnitsSold = new Map<string, number>();
  for (const sale of sales) {
    if (sale.date < start || sale.date > currentDate) continue;
    for (const line of sale.lines) {
      recentUnitsSold.set(
        line.productId,
        (recentUnitsSold.get(line.productId) ?? 0) + line.qty,
      );
    }
  }
  return products
    .map((product) => {
      const unitsSold = recentUnitsSold.get(product.id) ?? 0;
      const targetStock = Math.max(Math.ceil(unitsSold), product.minStock);
      const suggestedQuantity = Math.max(0, targetStock - product.stock);
      return {
        product,
        unitsSold,
        targetStock,
        suggestedQuantity,
        daysOfStock: unitsSold > 0 ? (product.stock / unitsSold) * 30 : Infinity,
      };
    })
    .filter((item) => item.suggestedQuantity > 0)
    .sort((a, b) => a.daysOfStock - b.daysOfStock)
    .slice(0, 5);
}

export function getInventoryMetrics(products: Product[]) {
  const lowStockProducts = products.filter(
    (product) => product.stock <= product.minStock,
  );
  return {
    stockCount: products.reduce((sum, product) => sum + product.stock, 0),
    stockCostValue: products.reduce(
      (sum, product) => sum + product.cost * product.stock,
      0,
    ),
    retailValue: products.reduce(
      (sum, product) => sum + product.price * product.stock,
      0,
    ),
    lowStockProducts,
    lowStockCount: lowStockProducts.length,
  };
}
