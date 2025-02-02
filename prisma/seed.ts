import { PrismaClient } from '../prisma/client'

const prisma = new PrismaClient()


const serials = [
  {
    id: 1,
    code: 'B'
  },
  {
    id: 2,
    code: 'E'
  }
];

const classificationTypes = [
  {
    id: 1,
    name: 'SERVICIOS'
  },
  {
    id: 2,
    name: 'BIENES'
  }
];

const taxPayerTypes = [
  {
    id: 1,
    name: 'PERSONA JURIDICA'
  },
  {
    id: 2,
    name: 'PERSONA FISICA'
  }
];

const invoiceTypes = [
  {
    id: '01',
    name: '01-GASTOS DE PERSONAL'
  },
  {
    id: '02',
    name: '02-GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS'
  },
  {
    id: '03',
    name: '03-ARRENDAMIENTOS'
  },
  {
    id: '04',
    name: '04-GASTOS DE ACTIVO FIJO'
  },
  {
    id: '05',
    name: '05-GASTOS DE REPRESENTACIÓN'
  },
  {
    id: '06',
    name: '06-OTRAS DEDUCCIONES ADMITIDAS'
  },
  {
    id: '07',
    name: '07-GASTOS FINANCIEROS'
  },
  {
    id: '08',
    name: '08-GASTOS EXTRAORDINARIOS'
  },
  {
    id: '09',
    name: '09-COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA'
  },
  {
    id: '10',
    name: '10-ADQUISICIONES DE ACTIVOS'
  },
  {
    id: '11',
    name: '11-GASTOS DE SEGUROS'
  }
];

const paymentsMethods = [
  {
    id: '01',
    name: '01-EFECTIVO'
  },
  {
    id: '02',
    name: '02-COMPRA A CREDITO'
  },
  {
    id: '03',
    name: '03-TARJETA DE CREDITO O DEBITO'
  },
  {
    id: '04',
    name: '04-COMPRA A CREDITO'
  },
  {
    id: '05',
    name: '05-PERMUTA'
  },
  {
    id: '06',
    name: '06-NOTA DE CREDITO'
  },
  {
    id: '07',
    name: '07-MIXTO'
  }
];

const ncfs = [
  {
    id: '31',
    name: '31-FACTURA DE CREDITO FISCAL ELECTRONICO',
    serialId: 2
  },
  {
    id: '33',
    name: '33-NOTA DE DEBITO ELECTRONICA',
    serialId: 2
  },
  {
    id: '34',
    name: '33-NOTA DE CREDITO ELECTRONICA',
    serialId: 2
  },
  {
    id: '01',
    name: '01-FACTURA DE CREDITO FISCAL',
    serialId: 1
  },
  {
    id: '15',
    name: '15-COMPROBANTE GUBERNAMENTAL',
    serialId: 1
  },
  {
    id: '04',
    name: '04-NOTA DE CREDITO',
    serialId: 1
  }
];

const requestStatus = [
  {
    id: 1,
    name: 'PENDIENTE'
  },
  {
    id: 2,
    name: 'APROBADA'
  },
  {
    id: 3,
    name: 'RECHAZADA'
  }
];

const retentionsTaxes = [
  {
    id: 1,
    name: 'RETENCION AL 30%',
    rate: 30
  },
  {
    id: 2,
    name: 'RETENCION AL 100%',
    rate: 100
  }
];

const retentionsIsrs = [
  {
    id: '01',
    name: 'ALQUILERES - 10%',
    rate: 10
  },
  {
    id: '02',
    name: 'HONORARIOS POR SERVICIOS - 10%',
    rate: 10
  },
  {
    id: '03',
    name: 'OTRAS RENTAS - 10%',
    rate: 10
  },
  {
    id: '04',
    name: 'DIVIDENDOS - 10%',
    rate: 10
  },
  {
    id:'05',
    name: 'INTERESES PAGADOS A PERSONAS FISICAS, JURIDICAS O ENTIDADES NO RESIDENTES - 10%',
    rate: 10
  },
  {
    id: '06',
    name: 'PREMIOS - 25%',
    rate: 25
  },
  {
    id: '07',
    name: 'REMESAS AL EXTERIOR - 27%',
    rate: 27
  },
  {
    id: '08',
    name: 'PAGOS A PROVEEDORES DEL ESTADO - 5%',
    rate: 5
  }
];
async function main() {
  console.log(`Start seeding ...`)

  for (let item of retentionsTaxes) {
    let result = await prisma.retentionTax.create({
      data: item
    });
    console.log(result)
  }

  for (let item of retentionsIsrs) {
    let result = await prisma.retentionIsr.create({
      data: item
    });
    console.log(result)
  }

  for (let item of requestStatus) {
    let result = await prisma.requestStatus.create({
      data: item
    });
    console.log(result)
  }

  for (let item of classificationTypes) {
    let result = await prisma.classificationType.create({
      data: item
    });
    console.log(result)
  }

  for (let item of taxPayerTypes) {
    let result = await prisma.taxPayerTypes.create({
      data: item
    });
    console.log(result)
  }

  for (let item of invoiceTypes) {
    let result = await prisma.invoiceType.create({
      data: item
    });
    console.log(result)
  }

  for (let item of paymentsMethods) {
    let result = await prisma.paymentsMethods.create({
      data: item
    });
    console.log(result)
  }

  for (let item of serials) {
    let result = await prisma.serial.create({
      data: item
    });
    console.log(result)
  }
  for (let item of ncfs) {
    let result = await prisma.ncfsTypes.create({
      data: item
    });
    console.log(result)
  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
