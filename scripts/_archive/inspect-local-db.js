const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const columns = await prisma.$queryRaw`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        `;
        
        // Group by table_name
        const tables = {};
        columns.forEach(row => {
            if (!tables[row.table_name]) {
                tables[row.table_name] = [];
            }
            tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });
        
        console.log(JSON.stringify(tables, null, 2));
    } catch (err) {
        console.error('Prisma raw query error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
