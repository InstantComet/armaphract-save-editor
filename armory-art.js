const NS='http://www.w3.org/2000/svg';
function svg(viewBox,paths,cls){const node=document.createElementNS(NS,'svg');node.setAttribute('viewBox',viewBox);node.setAttribute('class',cls);node.setAttribute('aria-hidden','true');node.setAttribute('fill','none');node.setAttribute('stroke','currentColor');node.setAttribute('stroke-width','1.5');for(const d of paths){const p=document.createElementNS(NS,'path');p.setAttribute('d',d);node.append(p);}return node;}
export function moduleKind(name,info){return info?.engine?'engine':info?.optics?'optic':info?.armor?'armor':info?.gun||/launcher|cannon|rifle|MLRS|RPG|HMG|SMGs/i.test(name)?'weapon':info?.sensor?'sensor':'utility';}
const icons={
 engine:['M3 8h4V5h10v3h4v11H7v-3H3z','M8 3h7M10 8v8m4-8v8M21 11h2v5h-2'],
 optic:['M4 8l2-4h3l2 4m2 0 2-4h3l2 4','M2 9h8v10H2zm12 0h8v10h-8zM10 12h4M4 11h4v6H4zm12 0h4v6h-4z'],
 armor:['M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z'],
 weapon:['M2 11h18v3H2zM19 9h3v7h-3M4 14v4h5v-4M2 9h4v2'],
 sensor:['M12 4v16M4 12h16M7 7l10 10M7 17 17 7','M12 2 22 12 12 22 2 12z'],
 utility:['M12 2 22 7v10l-10 5-10-5V7z','M7 9v7l5 3 5-3V9l-5-3zM12 6v13']
};
export function moduleIcon(name,info){const kind=moduleKind(name,info);return svg('0 0 24 24',icons[kind],'module-icon '+kind);}
export function chassisDiagram(){return svg('0 0 120 200',[
 'M26 40h68v143H26zM32 47h56v128H32zM18 48h8v127h-8zM94 48h8v127h-8z',
 'M34 57h52l-4 28H38zM35 130h50v36H35zM38 137h44m-44 7h44m-44 7h44m-44 7h44',
 'M42 82h36l9 30-14 19H47l-14-19zM48 87h24v30H48zM56 87V12h8v75zM54 12h12V6H54z',
 'M18 58h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8M94 58h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8',
 'M34 175h16v5H34zM70 175h16v5H70zM68 92h7v7h-7zM40 100h8v8h-8z'
 ],'chassis-diagram');}
