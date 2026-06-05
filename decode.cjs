const { AbiCoder } = require('ethers');
const coder = AbiCoder.defaultAbiCoder();
const data = "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383638393735313635303537352d3130362e3735313631333032303839363933000000000000000000000000000000000000000000000000000000";
const typesToTry = [
  ['string'],
  ['bytes'],
  ['uint256', 'string'],
  ['uint256', 'uint256', 'string'],
  ['tuple(uint256, uint256, string)'],
  ['tuple(uint256, string)'],
  ['tuple(uint256, tuple(string))'],
  ['tuple(uint256, tuple(uint256, string))'],
  ['uint256[]', 'string'],
  ['tuple(uint256, string)[]'],
];

for (const type of typesToTry) {
  try {
    const decoded = coder.decode(type, "0x" + data);
    console.log(`Success with ${type}:`, decoded);
  } catch (e) {
    // ignore
  }
}
