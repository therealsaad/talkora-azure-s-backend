import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/db'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { unit1FavouriteThingsActivities } from '../seed/data/unit1FavouriteThings'
import { unit2PartnerActivities, unit3OrderActivities, unit4CalendarActivities } from '../seed/data/term1Units'

const authoredByLevel=[unit1FavouriteThingsActivities,unit2PartnerActivities,unit3OrderActivities,unit4CalendarActivities]

async function main(){
  await connectDatabase()
  try{
    const klass=await CurriculumClass.findOne({grade:4}).lean()
    if(!klass) throw new Error('Class 4 curriculum is missing')

    for(let levelNumber=1;levelNumber<=4;levelNumber+=1){
      if(levelNumber===1){
        console.info('Level 1 is managed by migrate:unit1-pedagogy; skipping the positional legacy migration.')
        continue
      }
      const level=await Level.findOne({classId:klass._id,number:levelNumber}).lean()
      if(!level) throw new Error(`Class 4 Level ${levelNumber} is missing`)
      const lesson=await Lesson.findOne({levelId:level._id}).sort({order:1}).lean()
      if(!lesson) throw new Error(`Level ${levelNumber} lesson is missing`)
      const existing=await Activity.find({lessonId:lesson._id}).sort({order:1}).lean()
      const authored=authoredByLevel[levelNumber-1]!
      console.info(`Level ${levelNumber}: ${existing.length} existing -> ${authored.length} authored activities`)

      if(!process.argv.includes('--apply')) continue

      const session=await mongoose.startSession()
      try{
        await session.withTransaction(async()=>{
          for(const activity of existing){
            await Activity.updateOne({_id:activity._id},{$set:{order:-1000-Math.abs(Number(activity.order||0))}},{session})
          }

          for(let i=0;i<authored.length;i+=1){
            const authoredActivity=authored[i]!
            const previous=existing[i]
            const content={...authoredActivity,lessonId:lesson._id,order:i+1,status:'active' as const,curriculumVersion:'term1-experience-v3',activityKey:`class4-unit${levelNumber}-activity${i+1}`}
            if(previous){
              await Activity.updateOne({_id:previous._id},{$set:content},{session,runValidators:true})
            }else{
              await Activity.create([content],{session})
            }
          }

          for(const extra of existing.slice(authored.length)){
            await Activity.updateOne({_id:extra._id},{$set:{status:'archived',order:-2000-Math.abs(Number(extra.order||0))}},{session})
          }
        })
      }finally{await session.endSession()}
    }

    if(!process.argv.includes('--apply')) console.info('Dry run complete. Pass --apply to migrate all four Term 1 levels.')
    else console.info('Term 1 experience v3 migration complete. Existing first-10 activity IDs were preserved where possible.')
  }finally{await disconnectDatabase()}
}

void main().catch((error)=>{console.error('Term 1 experience v3 migration failed:',error instanceof Error?error.message:error);process.exitCode=1})
