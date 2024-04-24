import writeGtfsFile from './gtfsWriter';
import fs from 'fs';
import path from 'path';

export function readJsonAndWriteGtfs(jsonPath: string, outputPath: string, sortField?: string) {
    const jsonFullPath = path.resolve(jsonPath);
    const { fields, data } = JSON.parse(fs.readFileSync(jsonFullPath, 'utf-8'));

    // Check if the sortField is provided and valid, then sort the data based on it
    if (sortField && fields.includes(sortField)) {
        data.sort((a: { [x: string]: string; }, b: { [x: string]: string; }) => {
            const valueA = a[sortField] || ''; // Fallback to empty string if undefined
            const valueB = b[sortField] || ''; // Fallback to empty string if undefined
            return valueA.localeCompare(valueB);
        });
    }

    writeGtfsFile(outputPath, fields, data);
}
