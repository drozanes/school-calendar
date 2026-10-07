type Track = "פנמצ" | "תורת עציון" | "אור עציון" | "כללי";
const determineTracks = (text: string, isCol12: boolean = false): Track[] => {
  if (isCol12) return ["תורת עציון"];
  
  const tracks = new Set<Track>();
  
  if (text.includes('תוצ') || text.includes('תו"צ') || text.includes('תו״צ') || text.includes('תורת עציון')) {
    tracks.add("תורת עציון");
  }
  
  if (text.includes('אור עציון') || text.includes('אוע') || text.includes('או"ע') || text.includes('או״ע')) {
    tracks.add("אור עציון");
    tracks.add("פנמצ");
  }
  
  // Removed 'ישיבה'
  if (text.includes('פנימיה')) {
    tracks.add("אור עציון");
  }

  if (text.includes('פנמצ') || text.includes('פנמ"צ') || text.includes('פנמ״צ')) {
    tracks.add("פנמצ");
  }

  if (tracks.size === 0) {
    return ["כללי"];
  }
  
  return Array.from(tracks);
};
console.log(determineTracks("נח - ישיבה תוצ"));
