# xml libarary documentation at:
# https://docs.python.org/3/library/xml.etree.elementtree.html

import xml.etree.ElementTree as et
import sys

END_SIZE = 30
END_WIDTH = 5

def main(inputPath, outputPath):
	tree = et.parse(inputPath)

	root = tree.getroot()
	del root.attrib['name']

	for shape in root.iter('shape'):
		name = shape.attrib['name']
		print(name)
		fixShape(shape)

	tree.write(outputPath + '/' + name + '.xml')

def fixShape(shape):
	shape.set('h', str(END_SIZE))
	shape.set('w', str(END_SIZE))

	strokeW = shape.find('./foreground/strokewidth')
	strokeW.set('width', str(END_WIDTH))

	# find max&min x&y for scaling
	largestX = ''
	largestY = ''
	smallestX = ''
	smallestY = ''
	for path in shape.findall('./foreground/path'):
		for child in path.getchildren():
			for key, val in child.attrib.items():
				val = float(val)
				if 'x' in key or 'X' in key:
					if type(largestX) != float or val > largestX:
						largestX = val
					if type(smallestX) != float or val < smallestX:
						smallestX = val
				elif 'y' in key or 'Y' in key:
					if type(largestY) != float or val > largestY:
						largestY = val
					if type(smallestY) != float or val < smallestY:
						smallestY = val

	# calculate scaling constants
	xScale = (END_SIZE - 2*END_WIDTH) / (largestX - smallestX)
	yScale = (END_SIZE - 2*END_WIDTH) / (largestY - smallestY)

	# transform coords
	for path in shape.findall('./foreground/path'):
		for child in path.getchildren():
			for key, val in child.attrib.items():
				val = float(val)
				if 'x' in key or 'X' in key:
					val -= smallestX
					val *= xScale
					val += END_WIDTH
				elif 'y' in key or 'Y' in key:
					val -= smallestY
					val *= yScale
					val += 2*END_WIDTH
				child.attrib[key] = str(val)


if __name__ == '__main__':
	if len(sys.argv) != 3:
		print('Usage: python3 xmlFixer.py <path/to/input.xml> <path/to/output/folder>')
		exit()
	main(sys.argv[1], sys.argv[2])
