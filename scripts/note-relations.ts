#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { basename, dirname, normalize, relative, resolve as resolvePath } from "node:path";
import { getWorkspace, validateWorkspace } from "./workspaces";
import { walkMarkdownFiles } from "./note-files";

const workspace=validateWorkspace(getWorkspace(process.env.KNOWLEDGE_WORKSPACE??"personal"));
const mode=process.argv[2]??"";
const requested=process.argv[3]?.trim()??"";
type Note={name:string;stem:string;path:string;relative:string;source:string};
type Link={source:Note;targetPath:string;raw:string};
const notes:Note[]=[];
for(const section of workspace.sections){
  for(const entry of walkMarkdownFiles(section.path)){
    if(entry.name==="index.md"||entry.name==="_index.md")continue;
    notes.push({name:entry.name,stem:basename(entry.name,".md"),path:entry.path,relative:relative(workspace.root,entry.path),source:readFileSync(entry.path,"utf8")});
  }
}
const byName=new Map(notes.map(n=>[n.name.toLocaleLowerCase("en-US"),n]));
const byPath=new Map(notes.map(n=>[normalize(n.path),n]));
const clean=(raw:string)=>{let v=raw.trim().split("|",1)[0].split("#",1)[0].split("?",1)[0].trim();try{v=decodeURIComponent(v)}catch{}return v;};
const resolveRequested=(value:string)=>byName.get(basename(clean(value)).toLocaleLowerCase("en-US"));
const links:Link[]=[];
for(const note of notes){
  const seen=new Set<string>();
  for(const match of note.source.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)){
    const raw=match[1]??"";
    if(/^(?:https?:|mailto:|tel:|ftp:|data:|javascript:|#)/i.test(raw))continue;
    const cleaned=clean(raw);
    if(!cleaned.toLowerCase().endsWith(".md"))continue;
    const targetPath=normalize(resolvePath(dirname(note.path),cleaned));
    if(!seen.has(targetPath)){links.push({source:note,targetPath,raw});seen.add(targetPath);}
  }
}
const selected=requested?resolveRequested(requested):undefined;
if(mode==="links"||mode==="backlinks"){
  if(!requested||!selected){console.error("ERROR: Note not found: "+(requested||"(missing)"));process.exit(1);}
  const rows=mode==="links"
    ?links.filter(l=>l.source.path===selected.path).map(l=>byPath.get(l.targetPath)).filter(Boolean)
    :links.filter(l=>byPath.get(l.targetPath)?.path===selected.path).map(l=>l.source);
  const unique=[...new Map(rows.map(n=>[n!.path,n!])).values()].sort((a,b)=>a.relative.localeCompare(b.relative));
  if(!unique.length){console.log("No "+mode+" for "+selected.name+".");process.exit(0);}
  for(const note of unique)console.log(note.relative);
  process.exit(0);
}
if(mode==="broken"){
  const broken=links.filter(l=>!byPath.has(l.targetPath));
  console.log("Notes scanned: "+notes.length);
  console.log("Relations checked: "+links.length);
  console.log("Broken relations: "+broken.length);
  for(const link of broken)console.log("- "+link.source.relative+" -> "+link.raw);
  process.exit(broken.length?1:0);
}
console.error("Usage: bun scripts/note-relations.ts <links|backlinks|broken> [filename.md]");
process.exit(2);
