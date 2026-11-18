import Papa from 'papaparse';
import { RawCompetition, RawDelivery, RawMatch, RawPlayingEleven, RawPlayerMapping, RawTeam } from '../types/cricket';

export type CSVFileType =
  | 'ball_by_ball'
  | 'matches'
  | 'competitions'
  | 'playing_eleven'
  | 'teams'
  | 'player_mapping'
  | 'unknown';

export function detectCSVType(headers: string[], fileName?: string): CSVFileType {
  const lowerName = (fileName || '').toLowerCase();
  if (lowerName.includes('ball_by_ball')) return 'ball_by_ball';
  if (lowerName.includes('competition_team_player_mapping') || lowerName.includes('player_mapping')) return 'player_mapping';
  if (lowerName.includes('playing_eleven') || lowerName.includes('playing11')) return 'playing_eleven';
  if (lowerName.includes('competitions')) return 'competitions';
  if (lowerName.includes('matches')) return 'matches';
  if (lowerName.includes('teams') && !lowerName.includes('mapping')) return 'teams';

  const lowerHeaders = headers.map(h => h.trim().toLowerCase());

  if (lowerHeaders.includes('striker_id') || lowerHeaders.includes('bowler_id') || lowerHeaders.includes('over_ball_num') || lowerHeaders.includes('innings_ball_num')) {
    return 'ball_by_ball';
  }
  if (lowerHeaders.includes('venue_id') || lowerHeaders.includes('first_inn_revised_overs') || lowerHeaders.includes('revised_target') || lowerHeaders.includes('match_date')) {
    return 'matches';
  }
  if (lowerHeaders.includes('match_format') || (lowerHeaders.includes('season') && lowerHeaders.includes('comp_name'))) {
    return 'competitions';
  }
  if (lowerHeaders.includes('is_played') || lowerHeaders.includes('is_impact') || lowerHeaders.includes('is_captain')) {
    return 'playing_eleven';
  }
  if (lowerHeaders.includes('team_id') && lowerHeaders.includes('team_name') && !lowerHeaders.includes('player_id')) {
    return 'teams';
  }
  if (lowerHeaders.includes('player_id') && (lowerHeaders.includes('player_name') || lowerHeaders.includes('competition_id'))) {
    return 'player_mapping';
  }

  return 'unknown';
}

export function parseCSVFile<T = any>(
  file: File,
  onProgress?: (percent: number, rowCount: number) => void
): Promise<{ type: CSVFileType; data: T[] }> {
  return new Promise((resolve, reject) => {
    let detectedType: CSVFileType = detectCSVType([], file.name);
    const rows: T[] = [];
    const fileSize = file.size;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true,
      step: (results) => {
        if (results.meta.fields && (detectedType === 'unknown' || detectedType === 'teams')) {
          const headerType = detectCSVType(results.meta.fields, file.name);
          if (headerType !== 'unknown') {
            detectedType = headerType;
          }
        }
        if (results.data && typeof results.data === 'object') {
          rows.push(results.data as T);
        }
        if (onProgress && rows.length % 5000 === 0) {
          const estimatedProgress = Math.min(99, Math.round((results.meta.cursor / fileSize) * 100));
          onProgress(estimatedProgress, rows.length);
        }
      },
      complete: () => {
        if (onProgress) onProgress(100, rows.length);
        resolve({ type: detectedType, data: rows });
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}
