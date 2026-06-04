function getSafeDuration(startTime){

  const start = Number(startTime);

  if(!start || isNaN(start) || start <= 0){
    return 0;
  }

  let duration = Date.now() - start;

  if(duration < 0) return 0;

  const MAX = 1000 * 60 * 60 * 24 * 365;
  if(duration > MAX) return 0;

  return duration;
}

function formatTime(ms){

  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}