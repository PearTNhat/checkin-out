import { decodeAbiParameters } from 'viem';

const data = "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383638393735313635303537352d3130362e3735313631333032303839363933000000000000000000000000000000000000000000000000000000";

const typesToTry = [
  [{ type: 'string' }],
  [{ type: 'bytes' }],
  [{ type: 'uint256' }, { type: 'string' }],
  [{ type: 'uint256' }, { type: 'uint256' }, { type: 'string' }],
  [{ type: 'tuple', components: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'string' }] }],
  [{ type: 'tuple', components: [{ type: 'uint256' }, { type: 'string' }] }],
  [{ type: 'uint256[]' }, { type: 'string' }],
];

for (const type of typesToTry) {
  try {
    const decoded = decodeAbiParameters(type, "0x" + data);
    console.log(`Success with:`, JSON.stringify(type));
    console.log(decoded);
  } catch (e) {
    // console.log(e);
  }
}
