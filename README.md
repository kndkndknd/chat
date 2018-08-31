# about
  - live setting by node.js + socket.io + web audio api
# usage(in 2018/6/13)
## basic function
  - type command and push enter, then sound by strings
  - The keyboard input contents are displayed on the connected client
  - all clients ignites in CHAT, PLAYBACK, TIMELAPSE, DRUM, and a client randomly ignites in other command
  - input client number in beginning of strings and space separated command, command ignites in specific client (ex. 0 WHITENOISE)
  - input timestamp (HH:MM or HH:MM:SS) in beginning of strings and space separated command, command ignites in timestamp
## command list
function       | detail                                                         | command                         
----------- | ------------------------------------------------------------ | ---------------------------------
CHAT        | video and audio, captured by microphone and webcam on each client, emit each other and play | CHAT or VIDEOCHAT                
FEEDBACK    | play audio caputured by microphone                 | FEEDBACK or FEED                 
SINEWAVE    | play sinewave of input frequency                           | (input number)             
WHITENOISE  | play whitenoise                                   | WHITENOISE or NOISE               
CLICK       | play click                       | CLICK                             
RECORD      | record video and audio captured by microphone | RECORD or REC                     
PLAYBACK    | play video and audio recorded by RECORD                     | PLAYBACK or PLAY                  
DRUM        | play kick, snare, hi-hat           | DRUM                              
BASS        | play bass sound | BASS 
SAMPLE RATE | change sampling rate in CHAT, DRUM, PLAYBACK | SAMPLERATE or RATE                
STOP        | stop all audio and video                                 | STOP or ESC key
GLITCH      | glitch audio and video in CHAT, PLAYBACK                     | GLITCH                            
NO          | view client number                                         | NO                                
- stop sounds when input same command

## VOICE MODE

- switch VIDEO MODE input "VOICE" and Enter key
- read out strings in VOICE MODE
