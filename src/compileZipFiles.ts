import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

/**
 * Zips all files in the specified GTFS directory and outputs them to the specified path.
 * @param gtfsDirectory The directory containing the GTFS files.
 * @param outputPath The output path for the ZIP file.
 */
export function zipGtfsFiles(gtfsDirectory: string, outputPath: string): void {
  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Delete the existing file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Set the compression level
  });

  output.on('close', function () {
    console.log(`Archive created successfully, total bytes: ${archive.pointer()}`);
  });

  archive.on('error', function (err) {
    throw err;
  });

  archive.pipe(output);
  archive.directory(gtfsDirectory, false);
  archive.finalize();
}

