const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

// Models that MUST be scoped by tenantId (defined in schema.prisma with tenantId)
const tenantScopedModels = [
  'empresaConfig',
  'usuario',
  'sucursal',
  'deposito',
  'proveedor',
  'marca',
  'categoria',
  'producto',
  'listaPrecio',
  'cliente',
  'secuenciaFactura',
  'secuenciaPedido',
  'secuenciaPresupuesto',
  'secuenciaHojaDeRuta',
  'venta',
  'movimientoCuentaCorriente',
  'presupuesto',
  'cajaDiaria',
  'historialInventario',
  'historialPrecio',
  'movimientoStock',
  'pedido',
  'combo',
  'compra',
  'hojaDeRuta',
  'rendicionReparto',
  'cheque',
  'liquidacionComision'
];

function getAllFiles(dir, exts = ['.ts', '.tsx']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllFiles(srcDir);
console.log(`Auditing ${files.length} source files for multi-tenant isolation...`);

const findings = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for prisma.<model>.(findMany|findFirst|findUnique|aggregate|groupBy|count)
    for (const model of tenantScopedModels) {
      const regex = new RegExp(`prisma\\.${model}\\.(findMany|findFirst|aggregate|groupBy|count)\\s*\\(`, 'i');
      if (regex.test(line)) {
        // Collect following lines until closing parenthesis to see where clause
        let callBlock = '';
        for (let j = i; j < Math.min(lines.length, i + 25); j++) {
          callBlock += lines[j] + '\n';
          if (lines[j].includes('});') || lines[j].includes('})')) {
            break;
          }
        }

        const hasTenantId = callBlock.includes('tenantId') || callBlock.includes('tenant.id') || callBlock.includes('currentTenant');
        if (!hasTenantId) {
          findings.push({
            file: path.relative(path.join(__dirname, '..'), file),
            line: i + 1,
            model,
            snippet: callBlock.trim().slice(0, 200)
          });
        }
      }
    }
  }
}

console.log(`\nFound ${findings.length} queries without explicit tenantId scoping:`);
findings.forEach((f, idx) => {
  console.log(`\n[${idx + 1}] ${f.file}:${f.line} -> model: ${f.model}`);
  console.log(f.snippet);
});
