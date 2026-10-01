#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const project=process.cwd(), runtime=join(project,".runtime","personal","runtime.env");
let failures=0;
const check=(ok:boolean,label:string,detail="")=>{ console.log((ok?"PASS":"FAIL")+": "+label+(detail?" — "+detail:"")); if(!ok) failures++; };
check(existsSync(runtime),"runtime environment",runtime);
if(!existsSync(runtime)) process.exit(1);
const env=Object.fromEntries(readFileSync(runtime,"utf8").split("\n").filter(Boolean).map((line)=>{const i=line.indexOf("=");return i<0?[line,""]:[line.slice(0,i),line.slice(i+1)];}));
const root=env.WORKSPACE_ROOT??"";
check(Boolean(root)&&existsSync(root),"workspace root",root);
const dirs=["0-Inbox","1-Projects","2-Areas","3-Resources","4-Archives"];
let noteCount=0, duplicateCount=0, invalidCount=0; const names=new Set<string>();
for(const dir of dirs){
  const path=join(root,dir), ok=Boolean(root)&&existsSync(path); check(ok,"MOC "+dir); if(!ok) continue;
  for(const entry of readdirSync(path,{withFileTypes:true})){
    if(entry.isDirectory()){failures++;console.log("FAIL: subdirectory in "+dir+": "+entry.name);continue;}
    if(!entry.isFile()||!entry.name.endsWith(".md")) continue; noteCount++;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.name)||entry.name==="index.md"||entry.name==="_index.md") invalidCount++;
    const key=entry.name.normalize("NFKC").toLocaleLowerCase("en-US"); if(names.has(key)) duplicateCount++; else names.add(key);
  }
}
check(invalidCount===0,"filename policy",invalidCount+" invalid");
check(duplicateCount===0,"global filename uniqueness",duplicateCount+" duplicates");
const git=spawnSync("git",["-C",root,"rev-parse","--is-inside-work-tree"],{encoding:"utf8"});
check(git.status===0&&git.stdout.trim()==="true","personal notes Git repository");
const remotes=spawnSync("git",["-C",root,"remote"],{encoding:"utf8"});
check(remotes.status===0&&!remotes.stdout.trim(),"personal notes have no Git remote");
for(const command of ["bun","npm","hugo","d2","typst","inotifywait","curl","systemctl","fzf","glow","nvim"]){
  check(spawnSync("sh",["-lc","command -v "+command],{stdio:"ignore"}).status===0,"command "+command);
}
for(const service of ["knowledge-personal-search.service","knowledge-personal-web.service","knowledge-personal-watch.service","knowledge-docs-browser.service","knowledge-docs-watch.service"]){
  check(spawnSync("systemctl",["--user","is-active","--quiet",service]).status===0,"service "+service);
}
const relations=spawnSync(process.execPath,[join(project,"scripts","note-relations.ts"),"broken"],{cwd:project,encoding:"utf8"});
check(relations.status===0,"wikilink/Markdown relations",relations.status===0?"no broken relations":"broken relations found");
console.log(""); console.log("Notes: "+noteCount); console.log("Result: "+(failures===0?"healthy":failures+" problem(s)"));
process.exit(failures===0?0:1);
