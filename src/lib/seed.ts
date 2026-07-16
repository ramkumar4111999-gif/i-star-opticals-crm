import { db } from '@/lib/db';

export async function seedCRMData() {
  console.log('🌱 Seeding CRM data...');

  await db.$transaction(async (tx) => {
    // ─── CUSTOMERS (15) ───────────────────────────────────────────────
    const customerData = [
      {
        id: 'cust_001',
        name: 'Murugan S',
        phone: '6377561001',
        email: 'murugan.s@email.com',
        address: '12, Anna Nagar, Madurai',
        group: 'Regular',
        loyaltyPoints: 150,
        totalSpent: 8500,
      },
      {
        id: 'cust_002',
        name: 'Aishwarya R',
        phone: '6377561002',
        email: 'aishwarya.r@email.com',
        address: '45, T. Nagar, Chennai',
        group: 'Regular',
        loyaltyPoints: 230,
        totalSpent: 12200,
      },
      {
        id: 'cust_003',
        name: 'Kumaravel P',
        phone: '6377561003',
        address: '78, Gandhipuram, Coimbatore',
        group: 'Wholesale',
        loyaltyPoints: 500,
        totalSpent: 45000,
      },
      {
        id: 'cust_004',
        name: 'Priya Dharshini K',
        phone: '6377561004',
        email: 'priya.d@email.com',
        address: '23, Race Course, Coimbatore',
        group: 'Premium',
        loyaltyPoints: 820,
        totalSpent: 38500,
      },
      {
        id: 'cust_005',
        name: 'Senthil Kumar M',
        phone: '6377561005',
        address: '56, K. K. Nagar, Chennai',
        group: 'Regular',
        loyaltyPoints: 90,
        totalSpent: 5600,
      },
      {
        id: 'cust_006',
        name: 'Lakshmi Narayanan V',
        phone: '6377561006',
        email: 'lakshmi.n@email.com',
        address: '34, Besant Nagar, Chennai',
        group: 'Premium',
        loyaltyPoints: 1100,
        totalSpent: 62000,
      },
      {
        id: 'cust_007',
        name: 'Karthik Rajan S',
        phone: '6377561007',
        address: '89, Velachery, Chennai',
        group: 'Regular',
        loyaltyPoints: 60,
        totalSpent: 3200,
      },
      {
        id: 'cust_008',
        name: 'Meenakshi Sundaram R',
        phone: '6377561008',
        email: 'meenakshi.s@email.com',
        address: '67, Pondy Bazaar, Chennai',
        group: 'Wholesale',
        loyaltyPoints: 350,
        totalSpent: 28000,
      },
      {
        id: 'cust_009',
        name: 'Vijayalakshmi A',
        phone: '6377561009',
        address: '12, M.G. Road, Salem',
        group: 'Regular',
        loyaltyPoints: 180,
        totalSpent: 9800,
      },
      {
        id: 'cust_010',
        name: 'Deepak Raj G',
        phone: '6377561010',
        email: 'deepak.raj@email.com',
        address: '101, Habsiguda, Trichy',
        group: 'Regular',
        loyaltyPoints: 45,
        totalSpent: 2100,
      },
      {
        id: 'cust_011',
        name: 'Anandhi Devi N',
        phone: '6377561011',
        address: '33, Palayamkottai, Tirunelveli',
        group: 'Regular',
        loyaltyPoints: 270,
        totalSpent: 14500,
      },
      {
        id: 'cust_012',
        name: 'Rajesh Babu K',
        phone: '6377561012',
        email: 'rajesh.babu@email.com',
        address: '55, NSK Salai, Chennai',
        group: 'Premium',
        loyaltyPoints: 950,
        totalSpent: 52000,
      },
      {
        id: 'cust_013',
        name: 'Saranya Murali',
        phone: '6377561013',
        address: '78, VOC Road, Erode',
        group: 'New',
        loyaltyPoints: 0,
        totalSpent: 0,
      },
      {
        id: 'cust_014',
        name: 'Ganesh Moorthy S',
        phone: '6377561014',
        address: '22, Vepery, Chennai',
        group: 'Regular',
        loyaltyPoints: 120,
        totalSpent: 7300,
      },
      {
        id: 'cust_015',
        name: 'Divya Bharathi P',
        phone: '6377561015',
        email: 'divya.b@email.com',
        address: '44, Avinashi Road, Coimbatore',
        group: 'Regular',
        loyaltyPoints: 310,
        totalSpent: 16800,
      },
    ];

    const customerMap = new Map<string, string>();
    for (const c of customerData) {
      const customer = await tx.customer.upsert({
        where: { id: c.id },
        update: c,
        create: c,
      });
      customerMap.set(c.id, customer.id);
    }
    console.log(`  ✅ ${customerData.length} customers seeded`);

    // ─── PRODUCTS (28) ────────────────────────────────────────────────
    const productData = [
      // Frames
      {
        id: 'prod_001',
        name: 'Ray-Ban Aviator Gold',
        category: 'Frames',
        brand: 'Ray-Ban',
        model: 'RB3025',
        color: 'Gold/Green',
        price: 3500,
        costPrice: 1800,
        stock: 12,
        minStock: 5,
        sku: 'RB-AVI-GG-001',
        type: 'Metal',
      },
      {
        id: 'prod_002',
        name: 'Ray-Ban Wayfarer Classic',
        category: 'Frames',
        brand: 'Ray-Ban',
        model: 'RB2140',
        color: 'Black',
        price: 3200,
        costPrice: 1650,
        stock: 8,
        minStock: 5,
        sku: 'RB-WAY-BK-001',
        type: 'Acetate',
      },
      {
        id: 'prod_003',
        name: 'Titan Eye+ Rectangle',
        category: 'Frames',
        brand: 'Titan',
        model: 'TE-1540',
        color: 'Silver/Grey',
        price: 1800,
        costPrice: 850,
        stock: 15,
        minStock: 5,
        sku: 'TT-REC-SG-001',
        type: 'Metal',
      },
      {
        id: 'prod_004',
        name: 'Fastrack Round Metal',
        category: 'Frames',
        brand: 'Fastrack',
        model: 'FE-2012R',
        color: 'Rose Gold',
        price: 1200,
        costPrice: 550,
        stock: 20,
        minStock: 8,
        sku: 'FT-RND-RG-001',
        type: 'Metal',
      },
      {
        id: 'prod_005',
        name: 'Oakley Holbrook XL',
        category: 'Frames',
        brand: 'Oakley',
        model: 'OO9417',
        color: 'Matte Black',
        price: 5500,
        costPrice: 3200,
        stock: 4, // LOW STOCK
        minStock: 5,
        sku: 'OK-HOL-MB-001',
        type: 'Acetate',
      },
      {
        id: 'prod_006',
        name: 'Vincent Chase FC',
        category: 'Frames',
        brand: 'Vincent Chase',
        model: 'VC-6420',
        color: 'Tortoise',
        price: 950,
        costPrice: 400,
        stock: 25,
        minStock: 10,
        sku: 'VC-FC-TR-001',
        type: 'Acetate',
      },
      {
        id: 'prod_007',
        name: 'Fastrack Aviator Kids',
        category: 'Frames',
        brand: 'Fastrack',
        model: 'FE-K102',
        color: 'Blue',
        price: 800,
        costPrice: 350,
        stock: 2, // LOW STOCK
        minStock: 5,
        sku: 'FT-AVI-BL-001',
        type: 'Metal',
      },
      {
        id: 'prod_008',
        name: 'Titan Rimless Titanium',
        category: 'Frames',
        brand: 'Titan',
        model: 'TE-RM800',
        color: 'Silver',
        price: 4200,
        costPrice: 2200,
        stock: 6,
        minStock: 3,
        sku: 'TT-RM-SI-001',
        type: 'Titanium',
      },

      // Lenses
      {
        id: 'prod_009',
        name: 'Essilor Crizal Easy Pro',
        category: 'Lenses',
        brand: 'Essilor',
        price: 2500,
        costPrice: 1200,
        stock: 25,
        minStock: 10,
        sku: 'ES-CEP-001',
        type: 'Blue-cut',
      },
      {
        id: 'prod_010',
        name: 'Essilor Crizal Forte UV',
        category: 'Lenses',
        brand: 'Essilor',
        price: 3200,
        costPrice: 1600,
        stock: 18,
        minStock: 8,
        sku: 'ES-CFU-001',
        type: 'Anti-Reflective',
      },
      {
        id: 'prod_011',
        name: 'Essilor Varilux Progressive',
        category: 'Lenses',
        brand: 'Essilor',
        price: 5500,
        costPrice: 3000,
        stock: 10,
        minStock: 5,
        sku: 'ES-VP-001',
        type: 'Progressive',
      },
      {
        id: 'prod_012',
        name: 'Zeiss Duravision BlueProtect',
        category: 'Lenses',
        brand: 'Zeiss',
        price: 3800,
        costPrice: 1900,
        stock: 3, // LOW STOCK
        minStock: 5,
        sku: 'ZS-DBP-001',
        type: 'Blue-cut',
      },
      {
        id: 'prod_013',
        name: 'Zeiss PhotoFusion X',
        category: 'Lenses',
        brand: 'Zeiss',
        price: 5200,
        costPrice: 2800,
        stock: 7,
        minStock: 4,
        sku: 'ZS-PFX-001',
        type: 'Photochromic',
      },
      {
        id: 'prod_014',
        name: 'Kodak Precise Progressive',
        category: 'Lenses',
        brand: 'Kodak',
        price: 4200,
        costPrice: 2100,
        stock: 9,
        minStock: 5,
        sku: 'KD-PP-001',
        type: 'Progressive',
      },
      {
        id: 'prod_015',
        name: 'Essilor Orma 1.50',
        category: 'Lenses',
        brand: 'Essilor',
        price: 800,
        costPrice: 350,
        stock: 40,
        minStock: 15,
        sku: 'ES-OR-001',
        type: 'Standard',
      },
      {
        id: 'prod_016',
        name: 'Zeiss DriveSafe',
        category: 'Lenses',
        brand: 'Zeiss',
        price: 4800,
        costPrice: 2500,
        stock: 2, // LOW STOCK
        minStock: 5,
        sku: 'ZS-DS-001',
        type: 'Anti-Reflective',
      },

      // Contact Lenses
      {
        id: 'prod_017',
        name: 'Bausch+Lomb Ultra',
        category: 'Contact Lenses',
        brand: 'Bausch+Lomb',
        price: 1800,
        costPrice: 900,
        stock: 15,
        minStock: 5,
        sku: 'BL-ULT-001',
        type: 'Monthly',
        duration: 'Monthly',
      },
      {
        id: 'prod_018',
        name: 'Acuvue Oasys',
        category: 'Contact Lenses',
        brand: 'Acuvue',
        price: 1500,
        costPrice: 750,
        stock: 20,
        minStock: 8,
        sku: 'AJ-OAS-001',
        type: 'Bi-weekly',
        duration: 'Bi-weekly',
      },
      {
        id: 'prod_019',
        name: 'Acuvue 1-Day Moist',
        category: 'Contact Lenses',
        brand: 'Acuvue',
        price: 2200,
        costPrice: 1100,
        stock: 12,
        minStock: 5,
        sku: 'AJ-1DM-001',
        type: 'Daily',
        duration: 'Daily',
      },
      {
        id: 'prod_020',
        name: 'Bausch+Lomb SofLens 59',
        category: 'Contact Lenses',
        brand: 'Bausch+Lomb',
        price: 650,
        costPrice: 300,
        stock: 1, // LOW STOCK
        minStock: 5,
        sku: 'BL-SL59-001',
        type: 'Monthly',
        duration: 'Monthly',
      },

      // Sunglasses
      {
        id: 'prod_021',
        name: 'Titan Sunglass Polarized',
        category: 'Sunglasses',
        brand: 'Titan',
        model: 'TS-9003',
        color: 'Black/Grey',
        price: 2200,
        costPrice: 1100,
        stock: 8,
        minStock: 3,
        sku: 'TT-SG-BG-001',
        type: 'Polarized',
      },
      {
        id: 'prod_022',
        name: 'Ray-Ban Clubmaster Classic',
        category: 'Sunglasses',
        brand: 'Ray-Ban',
        model: 'RB3016',
        color: 'Black/Green',
        price: 4800,
        costPrice: 2600,
        stock: 5,
        minStock: 3,
        sku: 'RB-CLB-BG-001',
        type: 'Classic',
      },
      {
        id: 'prod_023',
        name: 'Fastrack Pento Sunglass',
        category: 'Sunglasses',
        brand: 'Fastrack',
        model: 'FS-P200',
        color: 'Black/Grey',
        price: 1500,
        costPrice: 700,
        stock: 10,
        minStock: 4,
        sku: 'FT-PT-BG-001',
        type: 'Polarized',
      },
      {
        id: 'prod_024',
        name: 'Oakley Jawbreaker',
        category: 'Sunglasses',
        brand: 'Oakley',
        model: 'OO9290',
        color: 'Matte Black/Prizm',
        price: 9800,
        costPrice: 5500,
        stock: 3,
        minStock: 2,
        sku: 'OK-JB-MP-001',
        type: 'Sports',
      },

      // Solutions & Accessories
      {
        id: 'prod_025',
        name: 'ReNu MultiPlus 120ml',
        category: 'Solutions',
        brand: 'Bausch+Lomb',
        price: 280,
        costPrice: 140,
        stock: 30,
        minStock: 10,
        sku: 'BL-RNU-120',
        type: 'Multipurpose',
      },
      {
        id: 'prod_026',
        name: 'Opti-Free Puremoist 300ml',
        category: 'Solutions',
        brand: 'Alcon',
        price: 350,
        costPrice: 170,
        stock: 22,
        minStock: 8,
        sku: 'AL-OFP-300',
        type: 'Multipurpose',
      },
      {
        id: 'prod_027',
        name: 'Lens Cleaning Spray 60ml',
        category: 'Accessories',
        brand: 'Generic',
        price: 120,
        costPrice: 40,
        stock: 50,
        minStock: 15,
        sku: 'GN-LCS-060',
        type: 'Cleaning',
      },
      {
        id: 'prod_028',
        name: 'Microfiber Cloth (Pack of 3)',
        category: 'Accessories',
        brand: 'Generic',
        price: 150,
        costPrice: 45,
        stock: 40,
        minStock: 15,
        sku: 'GN-MFC-003',
        type: 'Cleaning',
      },
    ];

    const productMap = new Map<string, string>();
    for (const p of productData) {
      const product = await tx.product.upsert({
        where: { sku: p.sku },
        update: p,
        create: p,
      });
      productMap.set(p.id, product.id);
    }
    console.log(`  ✅ ${productData.length} products seeded`);

    // ─── SALES (8) ────────────────────────────────────────────────────
    // Helper: calculate GST (18% split equally CGST 9% + SGST 9%)
    function calcGST(subtotal: number, discount: number = 0) {
      const afterDiscount = subtotal - discount;
      const cgst = Math.round(afterDiscount * 0.09 * 100) / 100;
      const sgst = Math.round(afterDiscount * 0.09 * 100) / 100;
      const total = Math.round((afterDiscount + cgst + sgst) * 100) / 100;
      return { subtotal, discount, cgst, sgst, igst: 0, totalAmount: total };
    }

    // Helper to get a date N days ago at a specific hour
    function daysAgo(days: number, hour = 11) {
      const d = new Date();
      d.setDate(d.getDate() - days);
      d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      return d;
    }

    const salesData = [
      // Sale 1: Murugan - Frame + Lenses + Cleaning kit (today)
      {
        id: 'sale_001',
        invoiceNo: 'INV-2025-001',
        customerId: customerMap.get('cust_001')!,
        createdAt: daysAgo(0, 10),
        ...calcGST(3200 + 2500 + 120, 200),
        paymentMode: 'Cash',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_002')!, qty: 1, price: 3200, total: 3200 },
          { productId: productMap.get('prod_009')!, qty: 1, price: 2500, total: 2500 },
          { productId: productMap.get('prod_027')!, qty: 1, price: 120, total: 120 },
        ],
      },
      // Sale 2: Aishwarya - Contact lenses + Solution (yesterday)
      {
        id: 'sale_002',
        invoiceNo: 'INV-2025-002',
        customerId: customerMap.get('cust_002')!,
        createdAt: daysAgo(1, 14),
        ...calcGST(1800 * 2 + 350),
        paymentMode: 'UPI',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_017')!, qty: 2, price: 1800, total: 3600 },
          { productId: productMap.get('prod_026')!, qty: 1, price: 350, total: 350 },
        ],
      },
      // Sale 3: Kumaravel (Wholesale) - Bulk frames (3 days ago)
      {
        id: 'sale_003',
        invoiceNo: 'INV-2025-003',
        customerId: customerMap.get('cust_003')!,
        createdAt: daysAgo(3, 11),
        ...calcGST(1200 * 10 + 950 * 10, 3000),
        paymentMode: 'Bank Transfer',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_004')!, qty: 10, price: 1200, total: 12000 },
          { productId: productMap.get('prod_006')!, qty: 10, price: 950, total: 9500 },
        ],
      },
      // Sale 4: Priya Dharshini - Premium Ray-Ban + Zeiss lens (5 days ago)
      {
        id: 'sale_004',
        invoiceNo: 'INV-2025-004',
        customerId: customerMap.get('cust_004')!,
        createdAt: daysAgo(5, 15),
        ...calcGST(3500 + 3800, 500),
        paymentMode: 'Card',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_001')!, qty: 1, price: 3500, total: 3500 },
          { productId: productMap.get('prod_012')!, qty: 1, price: 3800, total: 3800 },
        ],
      },
      // Sale 5: Senthil Kumar - Computer glasses (8 days ago)
      {
        id: 'sale_005',
        invoiceNo: 'INV-2025-005',
        customerId: customerMap.get('cust_005')!,
        createdAt: daysAgo(8, 12),
        ...calcGST(2500 + 1800, 150),
        paymentMode: 'Cash',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_003')!, qty: 1, price: 1800, total: 1800 },
          { productId: productMap.get('prod_009')!, qty: 1, price: 2500, total: 2500 },
        ],
      },
      // Sale 6: Lakshmi Narayanan - Progressive + Titanium frame (12 days ago)
      {
        id: 'sale_006',
        invoiceNo: 'INV-2025-006',
        customerId: customerMap.get('cust_006')!,
        createdAt: daysAgo(12, 10),
        ...calcGST(4200 + 5500),
        paymentMode: 'Card',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_008')!, qty: 1, price: 4200, total: 4200 },
          { productId: productMap.get('prod_011')!, qty: 1, price: 5500, total: 5500 },
        ],
      },
      // Sale 7: Deepak Raj - Sunglasses (gift) (18 days ago)
      {
        id: 'sale_007',
        invoiceNo: 'INV-2025-007',
        customerId: customerMap.get('cust_010')!,
        createdAt: daysAgo(18, 16),
        ...calcGST(4800 + 150),
        paymentMode: 'UPI',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_022')!, qty: 1, price: 4800, total: 4800 },
          { productId: productMap.get('prod_028')!, qty: 1, price: 150, total: 150 },
        ],
      },
      // Sale 8: Ganesh Moorthy - Acuvue + Solution + Cleaning kit (25 days ago)
      {
        id: 'sale_008',
        invoiceNo: 'INV-2025-008',
        customerId: customerMap.get('cust_014')!,
        createdAt: daysAgo(25, 13),
        ...calcGST(1500 * 3 + 280 + 120),
        paymentMode: 'Cash',
        status: 'Completed',
        items: [
          { productId: productMap.get('prod_018')!, qty: 3, price: 1500, total: 4500 },
          { productId: productMap.get('prod_025')!, qty: 1, price: 280, total: 280 },
          { productId: productMap.get('prod_027')!, qty: 1, price: 120, total: 120 },
        ],
      },
    ];

    for (const s of salesData) {
      const { items, ...saleFields } = s;
      await tx.sale.upsert({
        where: { id: s.id },
        update: {},
        create: {
          ...saleFields,
          items: {
            create: items,
          },
        },
      });
    }
    console.log(`  ✅ ${salesData.length} sales seeded (${salesData.reduce((a, s) => a + s.items.length, 0)} items)`);

    // ─── LAB ORDERS (6) ───────────────────────────────────────────────
    const labOrdersData = [
      {
        id: 'lab_001',
        customerId: customerMap.get('cust_001')!,
        saleId: salesData[0].id,
        lensType: 'Single Vision Blue-cut',
        leftSPH: -1.5,
        leftCYL: -0.5,
        leftAXIS: 180,
        rightSPH: -2.0,
        rightCYL: -0.75,
        rightAXIS: 90,
        status: 'Delivered',
        costPrice: 1200,
        sellingPrice: 2500,
        notes: 'Crizal Easy Pro - delivered on time',
      },
      {
        id: 'lab_002',
        customerId: customerMap.get('cust_004')!,
        saleId: salesData[3].id,
        lensType: 'Single Vision Blue-cut',
        leftSPH: -3.25,
        leftCYL: -1.0,
        leftAXIS: 45,
        rightSPH: -2.75,
        rightCYL: -0.75,
        rightAXIS: 135,
        status: 'Ready',
        costPrice: 1900,
        sellingPrice: 3800,
        notes: 'Zeiss BlueProtect - ready for pickup',
      },
      {
        id: 'lab_003',
        customerId: customerMap.get('cust_006')!,
        saleId: salesData[5].id,
        lensType: 'Progressive',
        leftSPH: -2.0,
        leftCYL: -0.5,
        leftAXIS: 90,
        rightSPH: -1.5,
        rightCYL: -1.0,
        rightAXIS: 80,
        status: 'In Progress',
        costPrice: 3000,
        sellingPrice: 5500,
        notes: 'Varilux Progressive - processing at Essilor lab',
      },
      {
        id: 'lab_004',
        customerId: customerMap.get('cust_005')!,
        saleId: salesData[4].id,
        lensType: 'Single Vision Anti-Reflective',
        leftSPH: 0.0,
        leftCYL: -0.25,
        leftAXIS: 180,
        rightSPH: 0.25,
        rightCYL: -0.25,
        rightAXIS: 180,
        status: 'Sent',
        costPrice: 1200,
        sellingPrice: 2500,
        notes: 'Crizal Easy Pro - sent to lab today',
      },
      {
        id: 'lab_005',
        customerId: customerMap.get('cust_009')!,
        lensType: 'Bifocal',
        leftSPH: -1.0,
        leftCYL: -0.5,
        leftAXIS: 90,
        rightSPH: -1.25,
        rightCYL: -0.75,
        rightAXIS: 90,
        status: 'Sent',
        costPrice: 1500,
        sellingPrice: 3200,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        notes: 'Kodak Bifocal - reading segment +0.50 add',
      },
      {
        id: 'lab_006',
        customerId: customerMap.get('cust_011')!,
        lensType: 'Photochromic',
        leftSPH: -4.0,
        leftCYL: -1.25,
        leftAXIS: 30,
        rightSPH: -3.75,
        rightCYL: -1.5,
        rightAXIS: 150,
        status: 'In Progress',
        costPrice: 2800,
        sellingPrice: 5200,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        notes: 'Zeiss PhotoFusion X - high power, careful edging needed',
      },
    ];

    for (const l of labOrdersData) {
      await tx.labOrder.upsert({
        where: { id: l.id },
        update: {},
        create: l,
      });
    }
    console.log(`  ✅ ${labOrdersData.length} lab orders seeded`);

    // ─── APPOINTMENTS (5) ─────────────────────────────────────────────
    const now = new Date();
    // Set a fixed time for today's appointments (10:00 AM and 2:30 PM)
    const today10am = new Date(now);
    today10am.setHours(10, 0, 0, 0);
    const today230pm = new Date(now);
    today230pm.setHours(14, 30, 0, 0);
    const today4pm = new Date(now);
    today4pm.setHours(16, 0, 0, 0);

    const appointmentsData = [
      // TODAY appointments
      {
        id: 'appt_001',
        customerId: customerMap.get('cust_013')!,
        date: today10am,
        purpose: 'Eye Check-up',
        status: 'Scheduled',
        notes: 'New patient - walk-in enquiry last week',
      },
      {
        id: 'appt_002',
        customerId: customerMap.get('cust_007')!,
        date: today230pm,
        purpose: 'Contact Lens Trial',
        status: 'Confirmed',
        notes: 'Wants to switch from glasses to contact lenses',
      },
      {
        id: 'appt_003',
        customerId: customerMap.get('cust_010')!,
        date: today4pm,
        purpose: 'Follow-up',
        status: 'Scheduled',
        notes: 'Post-delivery follow-up for progressive lenses',
      },
      // Future appointments
      {
        id: 'appt_004',
        customerId: customerMap.get('cust_015')!,
        date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        purpose: 'Annual Eye Exam',
        status: 'Scheduled',
        notes: 'Regular annual check-up customer',
      },
      {
        id: 'appt_005',
        customerId: customerMap.get('cust_009')!,
        date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        purpose: 'Bifocal Consultation',
        status: 'Scheduled',
        notes: 'Patient prescribed bifocals. Lab order placed.',
      },
    ];

    for (const a of appointmentsData) {
      await tx.appointment.upsert({
        where: { id: a.id },
        update: {},
        create: a,
      });
    }
    console.log(`  ✅ ${appointmentsData.length} appointments seeded`);

    // ─── EXPENSES (12) ────────────────────────────────────────────────
    const expensesData = [
      {
        id: 'exp_001',
        category: 'Rent',
        description: 'Shop rent for January 2025',
        amount: 25000,
        date: new Date('2025-01-05'),
        vendor: 'Lakshmi Properties',
      },
      {
        id: 'exp_002',
        category: 'Salary',
        description: 'Staff salary - January 2025 (Ravi - Optometrist)',
        amount: 18000,
        date: new Date('2025-01-31'),
        vendor: 'Ravi Kumar',
      },
      {
        id: 'exp_003',
        category: 'Salary',
        description: 'Staff salary - January 2025 (Selvi - Sales)',
        amount: 12000,
        date: new Date('2025-01-31'),
        vendor: 'Selvi M',
      },
      {
        id: 'exp_004',
        category: 'Inventory',
        description: 'Monthly stock purchase - Essilor lenses batch',
        amount: 45000,
        date: new Date('2025-01-10'),
        vendor: 'Essilor India Pvt Ltd',
      },
      {
        id: 'exp_005',
        category: 'Inventory',
        description: 'Ray-Ban frames - new collection Q1 2025',
        amount: 35000,
        date: new Date('2025-01-15'),
        vendor: 'Luxottica India',
      },
      {
        id: 'exp_006',
        category: 'Electricity',
        description: 'Electricity bill - December 2024',
        amount: 4200,
        date: new Date('2025-01-08'),
        vendor: 'TNEB',
      },
      {
        id: 'exp_007',
        category: 'Maintenance',
        description: 'Lens edger machine servicing',
        amount: 3500,
        date: new Date('2025-01-12'),
        vendor: 'Nidek Service Center',
      },
      {
        id: 'exp_008',
        category: 'Marketing',
        description: 'Pamphlet printing - 500 copies for Pongal offer',
        amount: 2800,
        date: new Date('2025-01-13'),
        vendor: 'Sri Lakshmi Printers',
      },
      {
        id: 'exp_009',
        category: 'Marketing',
        description: 'Facebook & Instagram ads - January',
        amount: 5000,
        date: new Date('2025-01-01'),
        vendor: 'Meta Ads',
      },
      {
        id: 'exp_010',
        category: 'Logistics',
        description: 'Courier charges for lab orders (monthly)',
        amount: 1500,
        date: new Date('2025-01-20'),
        vendor: 'Delhivery',
      },
      {
        id: 'exp_011',
        category: 'Office Supplies',
        description: 'Receipt books, prescription pads, visiting cards',
        amount: 1800,
        date: new Date('2025-01-18'),
        vendor: 'Kumaran Stores',
      },
      {
        id: 'exp_012',
        category: 'Rent',
        description: 'Shop rent for February 2025',
        amount: 25000,
        date: new Date('2025-02-05'),
        vendor: 'Lakshmi Properties',
      },
    ];

    for (const e of expensesData) {
      await tx.expense.upsert({
        where: { id: e.id },
        update: {},
        create: e,
      });
    }
    console.log(`  ✅ ${expensesData.length} expenses seeded`);

    // ─── DUES (5) ─────────────────────────────────────────────────────
    const duesData = [
      {
        id: 'due_001',
        customerId: customerMap.get('cust_003')!,
        amount: 8000,
        paid: 5000,
        status: 'Partial',
        dueDate: new Date('2025-02-15'),
        notes: 'Wholesale order balance - promised by Feb 15',
      },
      {
        id: 'due_002',
        customerId: customerMap.get('cust_008')!,
        amount: 12000,
        paid: 0,
        status: 'Pending',
        dueDate: new Date('2025-01-30'),
        notes: 'Bifocal order for whole family - payment pending',
      },
      {
        id: 'due_003',
        customerId: customerMap.get('cust_009')!,
        amount: 3200,
        paid: 1500,
        status: 'Partial',
        dueDate: new Date('2025-02-05'),
        notes: 'Bifocal lens order - partial payment received',
      },
      {
        id: 'due_004',
        customerId: customerMap.get('cust_011')!,
        amount: 5200,
        paid: 0,
        status: 'Overdue',
        dueDate: new Date('2025-01-20'),
        notes: 'Photochromic lenses - followed up twice',
      },
      {
        id: 'due_005',
        customerId: customerMap.get('cust_012')!,
        amount: 15000,
        paid: 10000,
        status: 'Partial',
        dueDate: new Date('2025-02-28'),
        notes: 'Premium order - Oakley + Zeiss progressive',
      },
      {
        id: 'due_006',
        customerId: customerMap.get('cust_014')!,
        amount: 4900,
        paid: 0,
        status: 'Pending',
        dueDate: new Date('2025-02-10'),
        notes: 'Acuvue 6-month supply + cleaning kit',
      },
    ];

    for (const d of duesData) {
      await tx.due.upsert({
        where: { id: d.id },
        update: {},
        create: d,
      });
    }
    console.log(`  ✅ ${duesData.length} dues seeded`);

    // ─── PRESCRIPTIONS (5 sample) ─────────────────────────────────────
    const prescriptionsData = [
      {
        id: 'presc_001',
        customerId: customerMap.get('cust_001')!,
        leftSPH: -1.5,
        leftCYL: -0.5,
        leftAXIS: 180,
        leftPD: 32,
        rightSPH: -2.0,
        rightCYL: -0.75,
        rightAXIS: 90,
        rightPD: 31.5,
        notes: 'Mild astigmatism, prefers anti-glare coating',
      },
      {
        id: 'presc_002',
        customerId: customerMap.get('cust_004')!,
        leftSPH: -3.25,
        leftCYL: -1.0,
        leftAXIS: 45,
        leftPD: 30,
        rightSPH: -2.75,
        rightCYL: -0.75,
        rightAXIS: 135,
        rightPD: 30,
        notes: 'High myopia with astigmatism, needs thin lenses',
      },
      {
        id: 'presc_003',
        customerId: customerMap.get('cust_006')!,
        leftSPH: +2.0,
        leftCYL: -0.5,
        leftAXIS: 90,
        leftPD: 33,
        rightSPH: +1.75,
        rightCYL: -1.0,
        rightAXIS: 80,
        rightPD: 33,
        notes: 'Presbyopia onset, recommended progressive lenses',
      },
      {
        id: 'presc_004',
        customerId: customerMap.get('cust_010')!,
        leftSPH: -0.25,
        leftCYL: 0,
        leftAXIS: 0,
        leftPD: 31,
        rightSPH: -0.25,
        rightCYL: 0,
        rightAXIS: 0,
        rightPD: 31,
        notes: 'Very mild prescription, computer use mainly',
      },
      {
        id: 'presc_005',
        customerId: customerMap.get('cust_009')!,
        leftSPH: -1.0,
        leftCYL: -0.5,
        leftAXIS: 90,
        leftPD: 29,
        rightSPH: -1.25,
        rightCYL: -0.75,
        rightAXIS: 90,
        rightPD: 29.5,
        notes: 'Near vision deteriorating, bifocal recommended. ADD +1.50',
      },
    ];

    for (const p of prescriptionsData) {
      await tx.prescription.upsert({
        where: { id: p.id },
        update: {},
        create: p,
      });
    }
    console.log(`  ✅ ${prescriptionsData.length} prescriptions seeded`);

    // ─── VISITS (8 sample) ───────────────────────────────────────────
    const visitsData = [
      {
        id: 'visit_001',
        customerId: customerMap.get('cust_001')!,
        date: new Date('2025-01-05'),
        purpose: 'Eye Examination',
        notes: 'Regular annual check-up',
      },
      {
        id: 'visit_002',
        customerId: customerMap.get('cust_002')!,
        date: new Date('2025-01-08'),
        purpose: 'Contact Lens Fitting',
        notes: 'First-time contact lens user, taught insertion/removal',
      },
      {
        id: 'visit_003',
        customerId: customerMap.get('cust_003')!,
        date: new Date('2025-01-10'),
        purpose: 'Bulk Order Discussion',
        notes: 'Discussed wholesale rates for Q1 2025',
      },
      {
        id: 'visit_004',
        customerId: customerMap.get('cust_004')!,
        date: new Date('2025-01-12'),
        purpose: 'Frame Selection',
        notes: 'Selected Ray-Ban Aviator, prefers lightweight frames',
      },
      {
        id: 'visit_005',
        customerId: customerMap.get('cust_005')!,
        date: new Date('2025-01-15'),
        purpose: 'Eye Examination',
        notes: 'Complaints of headaches after computer use',
      },
      {
        id: 'visit_006',
        customerId: customerMap.get('cust_006')!,
        date: new Date('2025-01-18'),
        purpose: 'Progressive Consultation',
        notes: 'Difficulty reading small print, progressive recommended',
      },
      {
        id: 'visit_007',
        customerId: customerMap.get('cust_010')!,
        date: new Date('2025-01-20'),
        purpose: 'Glasses Delivery',
        notes: 'Picked up Ray-Ban Clubmaster, satisfied with fit',
      },
      {
        id: 'visit_008',
        customerId: customerMap.get('cust_014')!,
        date: new Date('2025-01-22'),
        purpose: 'Contact Lens Refill',
        notes: 'Acuvue Oasys - 3 boxes, 6-month supply',
      },
    ];

    for (const v of visitsData) {
      await tx.visit.upsert({
        where: { id: v.id },
        update: {},
        create: v,
      });
    }
    console.log(`  ✅ ${visitsData.length} visits seeded`);
  });

  console.log('🎉 CRM data seeding complete!');
  return { success: true, message: 'CRM data seeded successfully' };
}