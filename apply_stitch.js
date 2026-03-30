const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    '/Users/lateshk/Documents/GitHub/hr/src/app/dashboard/dashboard-client.tsx',
    '/Users/lateshk/Documents/GitHub/hr/src/components/dashboard/EmployeeWorkplace.tsx',
    '/Users/lateshk/Documents/GitHub/hr/src/components/dashboard/new/KpiCard.tsx',
    '/Users/lateshk/Documents/GitHub/hr/src/components/ui/card.tsx'
];

const stitchShadow = "shadow-[0_8px_30px_rgba(10,59,42,0.06),0_4px_12px_rgba(0,0,0,0.03)]";
const hoverStitchShadow = "hover:shadow-[0_12px_40px_rgba(10,59,42,0.1),0_4px_16px_rgba(0,0,0,0.05)]";

filesToUpdate.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // Remove borders from containers to match "No-Line" rule
        content = content.replace(/border border-green-[0-9]+\/?\d*/g, 'border-none');
        content = content.replace(/border border-emerald-[0-9]+\/?\d*/g, 'border-none');
        
        // Replace shadows with Stitch shadows
        content = content.replace(/shadow-lg/g, stitchShadow);
        content = content.replace(/shadow-md/g, "shadow-sm");
        
        // Apply hover shadow rules
        content = content.replace(/hover:shadow-xl /g, `${hoverStitchShadow} `);

        // Update hex colors to match Stitch Emerald Ledger exactly
        content = content.replace(/#14532d/gi, '#0a3b2a'); // old primary -> new primary_container
        content = content.replace(/#15803d/gi, '#002417'); // old bright -> new primary
        content = content.replace(/#166534/gi, '#002115'); // old hover -> new primary_fixed
        
        // Update gradient on Announcements
        content = content.replace(/from-\[#0f3d2e\] via-\[#134e4a\] to-\[#0a3b2a\]/g, 'from-[#002417] via-[#0a3b2a] to-[#0a3b2a]');
        content = content.replace(/from-\[#0f3d2e\] via-\[#134e4a\] to-\[#14532d\]/g, 'from-[#002417] via-[#0a3b2a] to-[#0a3b2a]');

        // Update Card component in EmployeeWorkplace
        content = content.replace(/<Card className="hover:border-green-300 /g, `<Card className="border-none ${stitchShadow} bg-white ${hoverStitchShadow} `);

        fs.writeFileSync(file, content, 'utf8');
        console.log(`Successfully updated Stitch styles in: ${path.basename(file)}`);
    } else {
        console.log(`Could not find ${file}`);
    }
});
