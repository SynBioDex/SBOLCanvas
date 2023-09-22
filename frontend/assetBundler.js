const fs = require("fs").promises
const path = require("path")

const BUNDLE_DIRS = [
    "src/assets/glyph_stencils/sequenceFeatures",
    "src/assets/glyph_stencils/molecularSpecies",
    "src/assets/glyph_stencils/interactions",
    "src/assets/glyph_stencils/interactionNodes",
    "src/assets/glyph_stencils/indicators",
    "src/assets/glyph_stencils/utils",
]

const BUNDLE_FILENAME = "bundle.xml"
const BUNDLE_ORDER_FILENAME = ".bundle_order"
const OUTPUT_DIR = "src/assets/glyph_stencils"


async function bundle() {
    // create bundle for each directory
    // using for loop instead of map so logs are in order
    const bundles = []
    for (const dir of BUNDLE_DIRS)
        bundles.push(await bundleDir(dir))

    // join them all together into one string
    const entireBundle = `<shapes>
    ${bundles.join("\n")}
</shapes>`

    // write bundle out
    const bundlePath = path.join(OUTPUT_DIR, BUNDLE_FILENAME)
    await fs.writeFile(bundlePath, entireBundle)
    console.log("\nWrote final bundle:", bundlePath)
}


async function bundleDir(dir) {
    console.log("\nBundling assets in", dir)

    // read in all files in directory
    const files = await fs.readdir(dir)
    console.log("\tFound", files.length, "files.")

    // try to sort files according to .bundle_order file
    try {
        // read in file
        const bundleOrderContent = (await fs.readFile(path.join(dir, BUNDLE_ORDER_FILENAME), "utf8"))
            .split(/\r?\n/)                // split by line
            .filter(item => !!item.trim()) // remove blanks
        const bundleOrder = bundleOrderContent.filter(item => !item.startsWith("!"))
        console.log("\tUsing bundle order.")

        // find exclusions
        const exclude = bundleOrderContent
            .filter(item => item.startsWith("!"))
            .map(item => item.replace("!", ""))

        // sort files array
        const findOrderIndex = fileName => {
            const index = bundleOrder.findIndex(item => fileName.includes(item))
            return index == -1 ? bundleOrder.length + 1 : index
        }
        files.sort(
            (a, b) => findOrderIndex(a) - findOrderIndex(b)
        )

        // filter out files that are in the exclusions
        const filesExcluded = []
        exclude.forEach(exclusion => {
            const index = files.findIndex(file => file.includes(exclusion))
            index != -1 && filesExcluded.push(files.splice(index, 1))
        })
        console.log("\tExcluding", filesExcluded.length, "files.")
    }
    catch (err) { console.error(err) }

    // await all file content to be loaded in
    const filesContents = await Promise.all(
        files
            // grab only XMLs
            .filter(fileName => fileName.endsWith('.xml'))
            // make sure we don't grab a preexisting bundle
            .filter(fileName => fileName != BUNDLE_FILENAME)
            // read in file content
            .map(fileName => fs.readFile(path.join(dir, fileName), "utf8"))
    )

    // combine content
    const joinedContent = filesContents
        // remove <shapes> tag
        .map(content => content.replace(/\<[\/]*shapes\>/g, ""))
        // add subdir attribute to <shape> tag
        .map(content => content.replace(/\<shape/g, `$& subdir="${path.basename(dir)}"`))
        // combine into one string
        .join("\n")

    return joinedContent
}

bundle()