import { initialState, transition } from './core.mjs';
const start=(contextId,at,text,focus=true)=>({type:'start',contextId,at,text,focus});
const audio=(contextId,n,at,duration_ms,label)=>({type:'frame',at,raw:{context_id:contextId,audio:`synthetic:chunk-${n}`,demo:{chunk_id:`chunk-${n}`,duration_ms,label},trace_id:`demo-trace-${contextId}`}});
const final=(context_id,at)=>({type:'frame',at,raw:{context_id,final:true,trace_id:`demo-trace-${context_id}`}});
const frame=(at,body)=>({type:'frame',at,raw:{context_id:'turn-a',trace_id:'demo-trace-turn-a',...body}});
const a='turn-a',b='turn-b';
export const scenarios=[
 {id:'interruption',name:'The interruption',short:'Old audio arrives after a new turn',duration:4400,moment:1600,
 question:'The user changed their mind. Will the old answer keep playing?',
 safe:'Local playback stops at the interruption. A fresh context owns the next turn, and late old frames are rejected.',
 broken:'Sending clear alone leaves the local queue running. Old chunks compete with the new answer.',
 takeaway:'Cancel locally first. Then signal clear and give the next turn a fresh context ID.',
 events:[start(a,0,'Your train leaves at nine tomorrow, from platform four.'),audio(a,1,300,900,'Your train leaves'),audio(a,2,600,800,'at nine tomorrow.'),{type:'interrupt',at:1100},start(b,1100,'Actually, make that Friday.'),audio(a,3,1250,650,'from platform four.'),audio(b,1,1400,800,'Switching to Friday.'),final(a,1600),audio(b,2,1900,600,'Here is the new plan.'),final(b,2100)]},
 {id:'normal',name:'A clean finish',short:'Final received, playback drains',duration:3000,moment:1700,
 question:'Does final mean the speaker should stop immediately?',
 safe:'Final closes incoming audio for this context. Already accepted chunks finish playing in order.',
 broken:'This happy path works in the naive client too. That is why happy-path tests alone miss reliability bugs.',
 takeaway:'Synthesis completion and local playback completion are different moments.',
 events:[start(a,0,'A reliable stream has a clear beginning and end.'),audio(a,1,300,900,'A reliable stream'),audio(a,2,650,850,'has a clear beginning'),audio(a,3,1000,650,'and end.'),final(a,1200)]},
 {id:'multiplex',name:'Crossed contexts',short:'Two streams, one playback owner',duration:3500,moment:1500,
 question:'Two contexts share a connection. Whose audio reaches the user?',
 safe:'Background frames are accepted into their own lane. Only the foreground context is eligible for playback.',
 broken:'A global FIFO ignores ownership. Background audio jumps ahead of the foreground response.',
 takeaway:'Route by context before enqueueing for a speaker. A connection is not a turn.',
 events:[start(a,0,'This is the foreground answer.'),start(b,0,'A separate background response.',false),audio(b,1,200,950,'Background: separate task'),audio(a,1,350,800,'Foreground: your answer'),audio(b,2,600,650,'Background: extra details'),audio(a,2,800,800,'Foreground: useful details'),final(b,1100),final(a,1200)]},
 {id:'warning',name:'A useful warning',short:'Invalid setting, synthesis continues',duration:3200,moment:1400,
 question:'One setting was ignored. Should that end the whole turn?',
 safe:'The machine-readable warning is logged. Synthesis continues with the accepted or fallback setting.',
 broken:'A generic failure handler treats a warning as terminal and drops the following audio.',
 takeaway:'Handle warning_code separately from fatal errors. Warnings are not stop signals.',
 events:[start(a,0,'The default setting still produces an answer.'),frame(220,{warning:'Buffer setting ignored; keeping previous value',warning_code:'INVALID_BUFFER_SIZE'}),audio(a,1,450,850,'The default setting'),audio(a,2,900,850,'still produces an answer.'),final(a,1150)]},
 {id:'fatal',name:'Fatal means finished',short:'No final frame is coming',duration:4200,moment:3300,
 question:'The server says fatal. Is your client still waiting for final?',
 safe:'A fatal error ends the affected context immediately. The trace ID stays available for diagnosis.',
 broken:'The client logs the error but only closes on final. It waits past the observation window.',
 takeaway:'Use fatal as a terminal signal; do not require an additional final frame.',
 events:[start(a,0,'This request cannot produce audio.'),frame(700,{error:'Synthetic invalid voice failure',error_code:'INVALID_VOICE',fatal:true})]},
 {id:'malformed',name:'The bad frame',short:'Invalid JSON between valid chunks',duration:3000,moment:1400,
 question:'Can one malformed message take the receiver down?',
 safe:'The parser quarantines the bad frame. A valid frame that follows still reaches the playback queue.',
 broken:'The model simulates an unguarded parser failure: the receiver halts and later frames are lost.',
 takeaway:'Validate at the boundary. Malformed data should not mutate lifecycle state.',
 events:[start(a,0,'One bad frame should not kill the receiver.'),audio(a,1,300,750,'One bad frame'),{type:'frame',at:650,raw:'{"context_id":"turn-a",broken'},audio(a,2,1000,900,'should not kill the receiver.'),final(a,1300)]},
 {id:'timeout',name:'The missing final',short:'Silence needs a bounded deadline',duration:4400,moment:3300,
 question:'Audio stopped arriving. How long will you keep a context open?',
 safe:'This demo applies a 3,000 ms total context deadline. Cleanup is bounded even when final never arrives.',
 broken:'Without a deadline, the context keeps waiting after playback has gone quiet.',
 takeaway:'Choose and test a deadline for your application. This fixture value is not a provider SLA.',
 events:[start(a,0,'The last frame will never arrive.'),audio(a,1,450,800,'The last frame'),audio(a,2,1000,650,'will never arrive.')]}];
export function replay(scenario,policy,at){
 const until=Math.max(0,Math.min(scenario.duration,Number.isFinite(at)?at:0));
 let state=initialState(policy);
 for(const event of scenario.events){if(event.at>until)break;state=transition(state,event);}
 return transition(state,{type:'tick',at:until});
}
