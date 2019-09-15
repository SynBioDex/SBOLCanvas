#!/usr/bin/env python3

# xml libarary documentation at:
# https://docs.python.org/3/library/xml.etree.elementtree.html

import xml.etree.ElementTree as et
import sys
import argparse

HEIGHT_MAX 	= 48
WIDTH_MAX 	= 48

MIN_X_PADDING = 3
MIN_Y_PADDING = 3

STROKE_WIDTH = 2.88

CENTERED = False
FILL_ALL = False

def main():
	args = parse_args()

	tree = et.parse(args.source)

	root = tree.getroot()
	try:
		if root.attrib['name']:
	 		del root.attrib['name']
	except:
		pass


	for shape in root.iter('shape'):
		name = shape.attrib['name']
		print(name)

		if FILL_ALL:
			set_all_strokes_to_fillstroke(shape)

		set_stroke_width(shape, STROKE_WIDTH)

		#remove_stroke_color_setting(shape)

		if not is_centered(shape):
			set_centered_attribute(shape, CENTERED)
			
		fixShape(shape)

	tree.write(args.dest)

def parse_args():
	parser = argparse.ArgumentParser()
	parser.add_argument("source")
	parser.add_argument("dest")
	parser.add_argument("-sw", "--stroke_width", action="store", type=float, help="sets the stroke width of the stencil")
	parser.add_argument("--fill", action="store_true", help="sets all strokes to be fillstrokes instead")
	parser.add_argument("--centered", action="store_true", help="centers the glyph horizontally and sets the attribute 'centered' to true")

	args = parser.parse_args()

	if args.stroke_width:
		global STROKE_WIDTH
		STROKE_WIDTH = args.stroke_width
	if args.fill == True:
		global FILL_ALL 
		FILL_ALL = True
	if args.centered == True:
		print('setting centered')
		global CENTERED
		CENTERED = True

	return args

def fixShape(shape):

	''' Scales the shape and ajusts its placement on the SVG 'page' '''
	shape.set('h', str(HEIGHT_MAX))
	shape.set('w', str(WIDTH_MAX))

	#
	# First we decide the scaling factor and rescale.
	#
	data = get_data(shape)
	print(data)

	# What is the scaling factor we need to fit in the x direction?
	# The total distance from min_x to max_x needs to be < WIDTH_MAX - MIN_X_PADDING * 2 // *2 because the x padding is on both sides.
	x_distance = data['max_x'] - data['min_x']
	x_scale = (WIDTH_MAX - MIN_X_PADDING * 2) / x_distance
	print("min x scale need = {scale}".format(scale=x_scale))

	# What is the scaling factor we need to fit in the y direction?
	# The total distance from min_y to max_y needs to be < HEIGHT_MAX - MIN_Y_PADDING
	y_distance = data['max_y'] - data['min_y']
	y_scale = (HEIGHT_MAX - MIN_Y_PADDING) / y_distance
	print("min y scale need = {scale}".format(scale=y_scale))

	# We take the minimum of these two scales to ensure that the whole thing fits on the SVG 'page'
	scale = min(x_scale, y_scale)
	scale_shape(shape, scale)

	#
	# Now that the shape is a managable size, we need to place it on the SVG 'page' perfectly
	# Get the data again because our coords have changed.
	#
	data = get_data(shape)
	print(data)

	# We take the width and center it 
	glyph_width = data['max_x'] - data['min_x']
	desired_dist = (WIDTH_MAX - glyph_width) / 2
	x_adjustment_dist = (data['min_x'] - desired_dist) * -1 if data['min_x'] - desired_dist >= 0 else desired_dist - data['min_x']
	print("x_adjustment_dist = {x}".format(x=x_adjustment_dist))
	shift_x_direction(shape, x_adjustment_dist)

	# Y direction might be a bit trickier depending on if the glyph is centered horizontally.
	glyph_height = data['max_y'] - data['min_y']
	print(glyph_height)
	desired_dist = HEIGHT_MAX - glyph_height

	if is_centered(shape):
		desired_dist = (HEIGHT_MAX - glyph_height) / 2
		print(desired_dist)

	y_adjustment_dist = (data['min_y'] - desired_dist) * -1 if data['min_y'] >= 0 else desired_dist - data['min_y']
		
	print("y_adjustment_dist = {y}".format(y=y_adjustment_dist))
	shift_y_direction(shape, y_adjustment_dist)


############################## Helper functions ########################################


def shift_x_direction(shape, distance):
	for path in shape.findall('./foreground/path'):
		for child in path.getchildren():
			for key, val in child.attrib.items():
				val = float(val)
				if 'x' in key.lower():
					val += distance
				child.attrib[key] = str(val)

	for ellipse in get_ellipses(shape):
		set_elipse_attrib(ellipse, 'x', float(get_elipse_attrib(ellipse, 'x')) + distance)

def shift_y_direction(shape, distance):
	for path in shape.findall('./foreground/path'):
		for child in path.getchildren():
			for key, val in child.attrib.items():
				val = float(val)
				if 'y' in key.lower():
					val += distance
				child.attrib[key] = str(val)

	for ellipse in get_ellipses(shape):
		set_elipse_attrib(ellipse, 'y', float(get_elipse_attrib(ellipse, 'y')) + distance)

def scale_shape(shape, factor):
	for path in shape.findall('./foreground/path'):
		for child in path.getchildren():
			for key, val in child.attrib.items():
				val = float(val)
				if 'x' in key or 'X' in key:
					val *= factor
				elif 'y' in key or 'Y' in key:
					val *= factor
				child.attrib[key] = str(val)

	for ellipse in get_ellipses(shape):
		set_elipse_attrib(ellipse, 'w', float(get_elipse_attrib(ellipse, 'w')) * factor)
		set_elipse_attrib(ellipse, 'h', float(get_elipse_attrib(ellipse, 'h')) * factor)


#
# Document settings helpers
#
def set_stroke_width(shape, width):
	setting = shape.find('./foreground/strokewidth')
	for key, val in setting.attrib.items():
		if 'width' in key:
			val = width
		setting.attrib[key] = str(val)

def set_all_strokes_to_fillstroke(shape):
	fore = shape.find('./foreground')
	for stroke_element in fore.iter('stroke'):
		stroke_element.tag = 'fillstroke'

def remove_stroke_color_setting(shape):
	fore = shape.find('./foreground')
	for stroke_color_element in fore.iter('strokecolor'):
		fore.remove(stroke_color_element)

def set_centered_attribute(shape, is_centered):
	shape.set('centered', str(is_centered))

def is_centered(shape):
	setting_found = False
	for key, val in shape.attrib.items():
		if 'centered' in key:
			setting_found = True
			if 'true' in val.lower():
				return True
	if not setting_found:
		print("'centered' attribute not found in shape, assuming it is not centered.")
	
	return False

#
# Path helpers
#

#
# Ellipse helpers
#
def get_ellipses(shape):
	return shape.findall('./foreground/ellipse')

def get_elipse_attrib(ellipse, key_arg):
	for key, val in ellipse.attrib.items():
		if key_arg.lower() in key or key_arg.upper() in key:
			return val
	assert(False), "Failed to find {key} attribute in ellipse".format(key=key_arg)

def set_elipse_attrib(ellipse, key_arg, val_arg):
	for key, val in ellipse.attrib.items():
		if key_arg.lower() in key:
			ellipse.attrib[key] = str(val_arg)
			return
		elif key_arg.upper() in key:
			ellipse.attrib[key] = str(val_arg)
			return
	assert(False), "Failed to set {key} attribute in ellipse".format(key=key_arg)


#
# Main Data scraper
#
def get_data(shape):
	data = {
		'min_y' : 0,
		'max_y' : 0,
		'min_x' : 0,
		'max_x' : 0,
		}
	

	is_first_path_x = True
	is_first_path_y = True

	for path in shape.findall('./foreground/path'):
		for child in path.getchildren():
			for key, val in child.attrib.items():
				val = float(val)

				if 'x' in key or 'X' in key:
					# Look for minimum x
					if is_first_path_x:
						data['min_x'] = val
						is_first_path_x = False
					elif data['min_x'] > val:
						data['min_x'] = val
					# Look for maximum x
					if data['max_x'] < val:
						data['max_x'] = val

				elif 'y' in key or 'Y' in key:
					# Look for minimum y
					if is_first_path_y:
						data['min_y'] = val
						is_first_path_y = False
					elif data['min_y'] > val:
						data['min_y'] = val
					# Look for maximum y
					if data['max_y'] < val:
						data['max_y'] = val
	for ellipse in get_ellipses(shape):
		x = float(get_elipse_attrib(ellipse, 'x'))
		y = float(get_elipse_attrib(ellipse, 'y'))
		w = float(get_elipse_attrib(ellipse, 'w'))
		h = float(get_elipse_attrib(ellipse, 'h'))
		
		# Look for minimum x,y
		if is_first_path_x:
			data['min_x'] = x
			is_first_path_x = False
		elif data['min_x'] > x:
			data['min_x'] = x
		if is_first_path_y:
			is_first_path_y = False
		elif data['min_y'] > y:
			data['min_y'] = y

		# Look for maximum x,y
		if data['max_x'] < x + w:
			data['max_x'] = x + w
		if data['max_y'] < y + h:
			data['max_y'] = y + h
			
	is_first_path_x = True
	is_first_path_y = True

	assert (data['min_y'] <= data['max_y']), "y-coords messed up!"
	assert (data['min_x'] <= data['max_x']), "x-coords messed up!"

	return data



if __name__ == '__main__':
	main()