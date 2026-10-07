import { IPvpItemRow } from '../../model/PlanningVsProduction/planning-vs-production.model';

/**
 * Dummy data shaped exactly like the expected API response rows.
 * Delete this file once the real endpoint is wired in PlanningVsProductionService.
 */
const HAND_PICKED: IPvpItemRow[] = [
  { CustomerId: 1, CustomerName: 'ABC CERAMICS LTD', DeliveryOrderId: 124, DeliveryOrderNo: 'DO-2024-00124', OrderDate: '2024-10-01', ItemId: 1, ItemCode: 'FT-6060-WH', ItemName: 'Floor Tile 60x60 White', OrderQty: 25000, PlannedQty: 25000, ProducedQty: 21500, Status: 'In Production' },
  { CustomerId: 1, CustomerName: 'ABC CERAMICS LTD', DeliveryOrderId: 124, DeliveryOrderNo: 'DO-2024-00124', OrderDate: '2024-10-01', ItemId: 2, ItemCode: 'FT-6060-IV', ItemName: 'Floor Tile 60x60 Ivory', OrderQty: 30000, PlannedQty: 25000, ProducedQty: 20500, Status: 'Partially Planned' },
  { CustomerId: 1, CustomerName: 'ABC CERAMICS LTD', DeliveryOrderId: 124, DeliveryOrderNo: 'DO-2024-00124', OrderDate: '2024-10-01', ItemId: 3, ItemCode: 'WT-3060-WH', ItemName: 'Wall Tile 30x60 White', OrderQty: 20000, PlannedQty: 15000, ProducedQty: 10000, Status: 'Partially Planned' },
  { CustomerId: 1, CustomerName: 'ABC CERAMICS LTD', DeliveryOrderId: 131, DeliveryOrderNo: 'DO-2024-00131', OrderDate: '2024-10-02', ItemId: 4, ItemCode: 'FT-6060-GR', ItemName: 'Floor Tile 60x60 Grey', OrderQty: 30000, PlannedQty: 25000, ProducedQty: 16000, Status: 'Partially Planned' },
  { CustomerId: 1, CustomerName: 'ABC CERAMICS LTD', DeliveryOrderId: 131, DeliveryOrderNo: 'DO-2024-00131', OrderDate: '2024-10-02', ItemId: 5, ItemCode: 'WT-3060-BE', ItemName: 'Wall Tile 30x60 Beige', OrderQty: 20000, PlannedQty: 15000, ProducedQty: 10000, Status: 'Partially Planned' },

  { CustomerId: 2, CustomerName: 'XYZ TRADING', DeliveryOrderId: 155, DeliveryOrderNo: 'DO-2024-00155', OrderDate: '2024-10-05', ItemId: 6, ItemCode: 'FT-8080-WH', ItemName: 'Floor Tile 80x80 White', OrderQty: 70000, PlannedQty: 60000, ProducedQty: 45000, Status: 'In Production' },
  { CustomerId: 2, CustomerName: 'XYZ TRADING', DeliveryOrderId: 155, DeliveryOrderNo: 'DO-2024-00155', OrderDate: '2024-10-05', ItemId: 7, ItemCode: 'FT-8080-BK', ItemName: 'Floor Tile 80x80 Black', OrderQty: 50000, PlannedQty: 40000, ProducedQty: 30000, Status: 'Partially Planned' },
  { CustomerId: 2, CustomerName: 'XYZ TRADING', DeliveryOrderId: 168, DeliveryOrderNo: 'DO-2024-00168', OrderDate: '2024-10-08', ItemId: 8, ItemCode: 'FT-6060-WH', ItemName: 'Floor Tile 60x60 White', OrderQty: 55000, PlannedQty: 45000, ProducedQty: 40000, Status: 'Partially Planned' },
  { CustomerId: 2, CustomerName: 'XYZ TRADING', DeliveryOrderId: 168, DeliveryOrderNo: 'DO-2024-00168', OrderDate: '2024-10-08', ItemId: 9, ItemCode: 'WT-3060-GR', ItemName: 'Wall Tile 30x60 Grey', OrderQty: 40000, PlannedQty: 35000, ProducedQty: 27000, Status: 'Partially Planned' },
];

const CUSTOMERS = [
  'DHAKA TILES', 'MEGHNA BUILDERS', 'RUPAYAN HOMES', 'SHANTA PROPERTIES', 'CONCORD DEVELOPERS',
  'NAVANA REAL ESTATE', 'BASHUNDHARA TRADING', 'SAIF ENTERPRISE', 'GREEN DELTA HOUSING', 'BENGAL INTERIORS',
  'PADMA CONSTRUCTION', 'CHITTAGONG CERAMIC HUB', 'SYLHET TILES CORNER', 'KHULNA HOME DECOR',
];

const ITEMS = [
  { code: 'FT-6060-WH', name: 'Floor Tile 60x60 White' },
  { code: 'FT-6060-IV', name: 'Floor Tile 60x60 Ivory' },
  { code: 'FT-6060-GR', name: 'Floor Tile 60x60 Grey' },
  { code: 'FT-8080-WH', name: 'Floor Tile 80x80 White' },
  { code: 'FT-8080-BK', name: 'Floor Tile 80x80 Black' },
  { code: 'WT-3060-WH', name: 'Wall Tile 30x60 White' },
  { code: 'WT-3060-BE', name: 'Wall Tile 30x60 Beige' },
  { code: 'WT-3060-GR', name: 'Wall Tile 30x60 Grey' },
  { code: 'PT-1224-WD', name: 'Plank Tile 120x20 Wood' },
];

/** Deterministic pseudo-random so the dummy data is stable between reloads. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generate(): IPvpItemRow[] {
  const rnd = seeded(42);
  const rows: IPvpItemRow[] = [];
  let doSeq = 200;

  CUSTOMERS.forEach((name, ci) => {
    const customerId = ci + 3;
    const orderCount = 1 + Math.floor(rnd() * 4);
    for (let o = 0; o < orderCount; o++) {
      const doId = doSeq++;
      const day = 1 + Math.floor(rnd() * 28);
      const month = 1 + Math.floor(rnd() * 12);
      const orderDate = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const itemCount = 1 + Math.floor(rnd() * 4);
      const picked = [...ITEMS].sort(() => rnd() - 0.5).slice(0, itemCount);

      picked.forEach((it, ii) => {
        const orderQty = (5 + Math.floor(rnd() * 60)) * 1000;
        const planRatio = [0, 0.5, 0.75, 0.9, 1, 1][Math.floor(rnd() * 6)];
        const plannedQty = Math.round((orderQty * planRatio) / 500) * 500;
        const producedQty = Math.round((plannedQty * rnd()) / 500) * 500;
        rows.push({
          CustomerId: customerId,
          CustomerName: name,
          DeliveryOrderId: doId,
          DeliveryOrderNo: `DO-2024-${String(doId).padStart(5, '0')}`,
          OrderDate: orderDate,
          ItemId: 100 + rows.length + ii,
          ItemCode: it.code,
          ItemName: it.name,
          OrderQty: orderQty,
          PlannedQty: plannedQty,
          ProducedQty: producedQty,
          Status: null, // left empty so the client-side status derivation is exercised
        });
      });
    }
  });
  return rows;
}

export const PVP_MOCK_ROWS: IPvpItemRow[] = [...HAND_PICKED, ...generate()];
