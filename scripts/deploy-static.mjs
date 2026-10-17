import {mkdtemp,cp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
// An explicit fallback when the OAuth token cannot upload Actions workflows.
const repo=process.argv[2];
if(!/^[\w.-]+\/[\w.-]+$/.test(repo??''))throw new Error('Usage: node scripts/deploy-static.mjs owner/repository');
const folder=await mkdtemp(resolve('.pages-'));
await cp(resolve('dist'),folder,{recursive:true});await writeFile(join(folder,'.nojekyll'),'');
const git=(...args)=>execFileSync('git',args,{cwd:folder,stdio:'inherit'});
git('init','-b','gh-pages');git('config','user.name','Lotto Lab');git('config','user.email','lotto-lab@users.noreply.github.com');git('add','.');git('commit','-m','Publish verified Lotto Lab static build');git('remote','add','origin',`https://github.com/${repo}.git`);git('push','--force','origin','gh-pages');
console.log('Static branch published. Enable Pages source gh-pages / using GitHub settings or API.');
