import yargs from 'yargs'
import * as csv from 'fast-csv'
import fs from 'fs'

interface LeBabyRow {
    time: string,
    timeZone: string,
    leftDuration: number,
    rightDuration: number,
    bottleVolume: number,
    pee: boolean,
    poo: boolean,
    sleepDuration: number,
    weight: number,
    height: number,
    headSize: number,
    vitamin: number,
    temperature: number,
    note: string
}

const formatDuration = (duration: number) => {
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    return `${minutes + 'm'} ${seconds + 's'}`
}

const formatTime = (time: string, timeZone: string) => {
    const date = new Date(`${time} ${timeZone}`)
    return date.toISOString()
}

const convert = <T extends csv.ParserRow> (
    inStream: csv.CsvParserStream<T, any>,
    outFile: string,
    transform: (row: T) => any
) => inStream.pipe(csv.format<T, any>({ headers: false }))
        .transform((row: T) => transform(row))
        .pipe(fs.createWriteStream(outFile))
        .on('error', error => console.error(error))
        .on('end', () => console.log(`Parsed data to ${outFile}`));

const extractDiaperRecords = (inStream: csv.CsvParserStream<LeBabyRow, any>, outDir: string) =>
    convert(inStream, outDir + '/diaper.csv', (row: LeBabyRow) => ({
        "Time": formatTime(row.time, row.timeZone),
        "Kind": row.poo && row.pee ? "Mixed" : row.poo ? "Dirty" : "Wet",
        "Notes": ""
    }))

const extractNursingRecords = (inStream: csv.CsvParserStream<LeBabyRow, any>, outDir: string) =>
    convert(inStream, outDir + '/nursing.csv', (row: LeBabyRow) => ({
        "Time": formatTime(row.time, row.timeZone),
        "Left duration": formatDuration(row.leftDuration),
        "Right duration": formatDuration(row.rightDuration),
        "Starting side": "Unknown",
        "Notes": ""
    }))

yargs(Bun.argv.slice(2))
    .usage('Usage: $0 <command> [options]')
    .command('$0 [input] [out]', 'Convert input to mango baby CSVs', (yargs) => {
        yargs.positional('input', {
            type: 'string',
            describe: 'Path to existing CSV data'
        })
        yargs.positional('input', {
            type: 'string',
            default: 'out',
            describe: 'Path to output directory'
        })
    }, async (args) => {
        const inFile = args.input as string
        const outDir = (args.out ?? 'out') as string
        console.log(`Extracting data from ${inFile} to ${outDir}`)

        fs.mkdirSync(outDir, { recursive: true })
        const data = csv.parseFile(inFile, { headers: true })

        extractNursingRecords(data, outDir)
        extractDiaperRecords(data, outDir)
    })
    .help()
    .argv;
