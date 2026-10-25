export function parseSchema(raw) {
 if(raw.length>20000)throw new Error('Schema file exceeds 20 KB.');
 let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error('Schema must contain valid JSON.');}
 if(!Array.isArray(parsed)||!parsed.length||parsed.length>20||parsed.some(f=>!Array.isArray(f)||f.length!==4||typeof f[0]!=='string'||!(/^[a-z][a-z0-9_]{0,39}$/).test(f[0])||typeof f[1]!=='string'||!f[1].trim()||f[1].length>80||!['text','number','date','email'].includes(f[2])||typeof f[3]!=='boolean')||new Set(parsed.map(f=>f[0])).size!==parsed.length)throw new Error('Use 1–20 unique fields: [key, label, type, required]. Keys use lowercase letters, digits and underscores.');
 return parsed;
}
