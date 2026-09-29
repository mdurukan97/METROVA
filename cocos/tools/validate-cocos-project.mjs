import { readFile, access } from 'node:fs/promises';

const pkg=JSON.parse(await readFile('package.json','utf8'));
if(pkg.creator?.version!=='3.8.8')throw new Error('Creator version must stay pinned to 3.8.8');
if(pkg.type!=='2d')throw new Error('METROVA must be a 2D Cocos project');
if(!pkg.uuid)throw new Error('Project UUID missing');

const scene=JSON.parse(await readFile('assets/scenes/Main.scene','utf8'));
if(scene[0]?.__type__!=='cc.SceneAsset')throw new Error('Main.scene is not a SceneAsset');
const canvas=scene.find(x=>x?.__type__==='cc.Node'&&x._name==='Canvas');
if(!canvas)throw new Error('Canvas missing');
const appShell=scene.find(x=>x?.__type__==='7d4e4t6bpFKc58oLEuOXRqQ');
if(!appShell)throw new Error('AppShellBootstrap component missing from Main.scene');
const transform=scene.find(x=>x?.__type__==='cc.UITransform'&&x.node?.__id__===scene.indexOf(canvas));
if(!transform||transform._contentSize?.width!==1280||transform._contentSize?.height!==720)throw new Error('Canvas must be 1280x720');

const required=[
 'assets/resources/data/istanbul-atlas.json',
 'assets/resources/data/tutorial-levels.json',
 'assets/resources/data/istanbul-district-geometry.json',
 'assets/resources/data/istanbul-night-roads.json',
 'assets/resources/data/m4-stations-verified.json',
 'assets/resources/data/pendik-sandbox.json'
];
for(const file of required)await access(file);
console.log('Cocos runtime project OK: Main.scene + AppShell + '+required.length+' runtime data assets.');
