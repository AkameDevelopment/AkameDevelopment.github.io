// Unknown/non-semantic versions are displayed without guessing that they are newer.
export function compareVersions(a,b){
 const parse=v=>{const m=String(v||'').trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([\da-z.-]+))?(?:\+[\da-z.-]+)?$/i);return m?{numbers:m.slice(1,4).map(x=>BigInt(x||0)),pre:m[4]?.split('.')||null}:null};
 const x=parse(a),y=parse(b);if(!x||!y)return null;
 for(let i=0;i<3;i++)if(x.numbers[i]!==y.numbers[i])return x.numbers[i]>y.numbers[i]?1:-1;
 if(!x.pre||!y.pre)return x.pre===y.pre?0:!x.pre?1:-1;
 for(let i=0;i<Math.max(x.pre.length,y.pre.length);i++){const p=x.pre[i],q=y.pre[i];if(p===q)continue;if(p===undefined)return -1;if(q===undefined)return 1;const pn=/^\d+$/.test(p),qn=/^\d+$/.test(q);if(pn&&qn){const n=BigInt(p),m=BigInt(q);if(n!==m)return n>m?1:-1;continue}if(pn!==qn)return pn?-1:1;return p>q?1:-1;}return 0;
}
export function newestRelease(rows){return (rows||[]).reduce((best,row)=>{if(!best)return row;const cmp=compareVersions(row.version,best.version);return cmp===1||(cmp===null&&String(row.created_at)>String(best.created_at))?row:best},null)}
export function libraryState(mod){const stable=newestRelease(mod.stable_releases||(mod.stable?[mod.stable]:[])),preview=newestRelease(mod.beta||[]);return {stable,preview,update:!!stable&&compareVersions(stable.version,mod.last_version)===1};}
