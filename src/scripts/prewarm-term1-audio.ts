import { connectDatabase, disconnectDatabase } from '../config/db'
import { getVoiceProvider } from '../providers/voice'
import { unit1FavouriteThingsActivities } from '../seed/data/unit1FavouriteThings'
import { unit2PartnerActivities, unit3OrderActivities, unit4CalendarActivities } from '../seed/data/term1Units'

function normalize(value: unknown){return typeof value==='string'?value.trim():''}
function collect(){
  const all=[unit1FavouriteThingsActivities,unit2PartnerActivities,unit3OrderActivities,unit4CalendarActivities]
  const lines:string[]=[]
  for(const activities of all){
    for(const activity of activities){
      for(const value of [activity.teacherPrompt,activity.prompt,activity.modelSentence]){
        const line=normalize(value)
        if(line) lines.push(line)
      }
    }
  }
  const seen=new Set<string>()
  return lines.filter((line)=>{const key=line.toLowerCase().replace(/\s+/g,' ');if(seen.has(key))return false;seen.add(key);return true})
}

async function main(){
  await connectDatabase()
  try{
    const provider=getVoiceProvider()
    const lines=collect()
    console.info(`Prewarming ${lines.length} fixed Term 1 lines with ${provider.name}...`)
    let ok=0
    for(const [index,line] of lines.entries()){
      try{
        await provider.synthesize(line)
        ok+=1
        console.info(`[${index+1}/${lines.length}] cached: ${line.slice(0,90)}`)
      }catch(error){
        console.error(`[${index+1}/${lines.length}] failed: ${line.slice(0,90)}`,error instanceof Error?error.message:error)
      }
    }
    console.info(`Prewarm complete: ${ok}/${lines.length} ready. Repeating the same text now reuses the cache.`)
  }finally{await disconnectDatabase()}
}

void main().catch((error)=>{console.error('Term 1 audio prewarm failed:',error instanceof Error?error.message:error);process.exitCode=1})
