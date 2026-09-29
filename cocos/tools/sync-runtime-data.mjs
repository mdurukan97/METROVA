import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const source=path.resolve('assets/data');
const target=path.resolve('assets/resources/data');
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
const files=(await readdir(source)).filter(name=>name.endsWith('.json'));
for(const name of files)await cp(path.join(source,name),path.join(target,name));
console.log('Synced '+files.length+' JSON assets into Cocos resources/data.');
