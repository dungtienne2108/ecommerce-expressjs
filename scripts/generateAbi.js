const fs = require('fs');
const path = require('path');

/**
 * Generate ABI files from compiled contracts
 * This script extracts ABIs from the artifacts directory and saves them to src/contracts/abis
 */

const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const abiDir = path.join(__dirname, '../src/contracts/abis');

// Create ABI directory if it doesn't exist
if (!fs.existsSync(abiDir)) {
  fs.mkdirSync(abiDir, { recursive: true });
}

const contracts = ['CashbackToken', 'CashbackManager', 'CashbackPool'];

contracts.forEach((contractName) => {
  const artifactPath = path.join(artifactsDir, `${contractName}.sol/${contractName}.json`);

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    const abiOutputPath = path.join(abiDir, `${contractName}.json`);
    fs.writeFileSync(abiOutputPath, JSON.stringify(abi, null, 2));
    console.log(`✓ Generated ABI for ${contractName} at ${abiOutputPath}`);
  } else {
    console.warn(`⚠ Artifact not found for ${contractName} at ${artifactPath}`);
  }
});

// Generate TypeScript ABI constants file
const abiConstantsFile = path.join(__dirname, '../src/contracts/abis.ts');
let abisContent = '// Auto-generated ABI constants\n\n';

contracts.forEach((contractName) => {
  const abiPath = path.join(abiDir, `${contractName}.json`);
  if (fs.existsSync(abiPath)) {
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    abisContent += `export const ${contractName}ABI = ${JSON.stringify(abi, null, 2)};\n\n`;
  }
});

fs.writeFileSync(abiConstantsFile, abisContent);
console.log(`✓ Generated ABI constants at ${abiConstantsFile}`);

console.log('\n✓ ABI generation completed successfully!');
