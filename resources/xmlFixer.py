#!/usr/bin/env python3

# xml libarary documentation at:
# https://docs.python.org/3/library/xml.etree.elementtree.html

import xml.etree.ElementTree as et
import sys
import argparse

HEIGHT_MAX 	= 48
WIDTH_MAX 	= 48

MIN_X_PADDING = 5
MIN_Y_PADDING = 3

MANUAL_Y_ADJUST = 0
MANUAL_X_ADJUST = 0

STROKE_WIDTH = 2.88

CENTERED = False
FILL_ALL = False

INF = 1000

SHIFT_EXCLUDE_LIST =['rx','ry','x-axis-rotation'] #they contain x and y, but should only be scaled

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
		print('name: {name}'.format(name=name))

		if FILL_ALL:
			set_all_strokes_to_fillstroke(shape)

		set_stroke_width(shape, STROKE_WIDTH)

		remove_stroke_color_setting(shape)
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
	parser.add_argument("-xp", "--xpadding", action="store", help="sets the minimum padding on the left and right sides")
	parser.add_argument("-yp", "--ypadding", action="store", help="sets the minimum padding on the top and bottom")
	parser.add_argument("-my", "--manual_y_adjustment", action="store", help="allows you to manually adjust the final y positioon of the svg. Positive value is upward direction.")
	parser.add_argument("-mx", "--manual_x_adjustment", action="store", help="allows you to manually adjust the final x positioon of the svg. Positive value moves it to the right.")

	args = parser.parse_args()

	if args.stroke_width:
		global STROKE_WIDTH
		STROKE_WIDTH = args.stroke_width
	if args.fill == True:
		global FILL_ALL 
		FILL_ALL = True
	if args.xpadding:
		global MIN_X_PADDING
		MIN_X_PADDING = float(args.xpadding)
	if args.ypadding:
		global MIN_Y_PADDING
		MIN_Y_PADDING = float(args.ypadding)
	if args.manual_y_adjustment:
		global MANUAL_Y_ADJUST
		MANUAL_Y_ADJUST = float(args.manual_y_adjustment)
	if args.centered == True:
		global CENTERED
		CENTERED = True

	return args

# def adjust_squigglies(shape, x, y):
# ''' Fixes the squigglies :) '''


def fixShape(shape):

	''' Scales the shape and ajusts its placement on the SVG 'page' '''
	shape.set('h', str(HEIGHT_MAX))
	shape.set('w', str(WIDTH_MAX))

	#
	# First we decide the scaling factor and rescale.
	#
	data = get_data(shape)

	# What is the maximum scaling factor we need to fit in the x direction?
	# The total distance from min_x to max_x needs to be < WIDTH_MAX - MIN_X_PADDING * 2 // *2 because the x padding is on both sides.
	x_distance = data['max_x'] - data['min_x']
	x_scale = (WIDTH_MAX - MIN_X_PADDING * 2) / x_distance if x_distance != 0 else INF
	print("max x scale need = {scale}".format(scale=x_scale))

	# What is the maximum scaling factor we need to fit in the y direction?
	# The total distance from min_y to max_y needs to be < HEIGHT_MAX - MIN_Y_PADDING
	y_distance = data['max_y'] - data['min_y']
	y_scale = (HEIGHT_MAX - MIN_Y_PADDING) / y_distance if y_distance != 0 else INF
	print("max y scale need = {scale}".format(scale=y_scale))

	# We take the minimum of these two scales to ensure that the whole thing fits on the SVG 'page'
	scale = min(x_scale, y_scale)
	print("scaling factor = {scale}".format(scale=scale))
	scale_shape(shape, scale)

	#
	# Now that the shape is a managable size, we need to place it on the SVG 'page' perfectly
	# Get the data again because our coords have changed.
	#
	data = get_data(shape)

	# We take the width and center it 
	glyph_width = data['max_x'] - data['min_x']
	desired_dist = (WIDTH_MAX - glyph_width) / 2
	x_adjustment_dist = (data['min_x'] - desired_dist) * -1 if data['min_x'] - desired_dist >= 0 else desired_dist - data['min_x']
	print("x_adjustment_dist = {x}".format(x=x_adjustment_dist))
	shift_x_or_y_direction(shape, x_adjustment_dist, 'x')

	# Y direction might be a bit trickier depending on if the glyph is centered horizontally.
	glyph_height = data['max_y'] - data['min_y']
	print("glyph height = {glyph_height}".format(glyph_height=glyph_height))
	desired_dist = HEIGHT_MAX - glyph_height

	if is_centered(shape):
		desired_dist = (HEIGHT_MAX - glyph_height) / 2
		print(desired_dist)

	y_adjustment_dist = (data['min_y'] - desired_dist) * -1 if data['min_y'] >= 0 else desired_dist - data['min_y']
		
	print("y_adjustment_dist = {y}".format(y=y_adjustment_dist))
	shift_x_or_y_direction(shape, y_adjustment_dist, 'y')

	# Here we allow the user to manually adjust the shape at the end.
	if MANUAL_Y_ADJUST != 0:
		shift_x_or_y_direction(shape, MANUAL_Y_ADJUST * -1, 'y') # We tell the user positive y is in the upward direction, so we need to flip the sign of the adjustment.
	if MANUAL_X_ADJUST != 0:
		shift_x_or_y_direction(shape, MANUAL_X_ADJUST, 'x')


############################## Helper functions ########################################

def shift_x_or_y_direction(shape, distance, x_or_y):
	assert(x_or_y == 'x' or x_or_y == 'y'), "x_or_y = {x_or_y}, must be 'x' or 'y'".format(x_or_y=x_or_y)
	for path in shape.findall('./foreground/path'):
		for child in path.getchildren():
			for key, val in child.attrib.items():
				val = float(val)
				if x_or_y in key.lower() and key.lower() not in SHIFT_EXCLUDE_LIST:
					val += distance
				child.attrib[key] = str(val)

	for ellipse in get_ellipses(shape):
		set_obj_attrib(ellipse, x_or_y, float(get_obj_attrib(ellipse, x_or_y)) + distance)
	for roundrect in get_roundrects(shape):
		set_obj_attrib(roundrect, x_or_y, float(get_obj_attrib(roundrect, x_or_y)) + distance)

	for text in shape.findall('./foreground/text'):
		for key, val in text.attrib.items():
			if x_or_y in key.lower():
				val = float(val)
				val += distance
			text.attrib[key] = str(val)

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
		set_obj_attrib(ellipse, 'w', float(get_obj_attrib(ellipse, 'w')) * factor)
		set_obj_attrib(ellipse, 'h', float(get_obj_attrib(ellipse, 'h')) * factor)


def get_obj_attrib(obj, key_arg):
	''' Given an xml object (path, ellipse, roundrect), return the value pointed to by the key. '''
	for key, val in obj.attrib.items():
		if key_arg.lower() in key or key_arg.upper() in key:
			return val
	assert(False), "Failed to find {key} attribute in obj".format(key=key_arg)

def set_obj_attrib(obj, key_arg, val_arg):
	''' Given an xml object (path, ellipse, roundrect), set the value pointed to by the key. '''
	for key, val in obj.attrib.items():
		if key_arg.lower() in key or key_arg.upper() in key:
			obj.attrib[key] = str(val_arg)
			return
	assert(False), "Failed to set {key} attribute in obj".format(key=key_arg)


#
# Document settings helpers
#
def set_stroke_width(shape, width):
	settings = shape.findall('./foreground/strokewidth')
	for setting in settings:
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
	
	return False

#
# Path helpers
#

#
# Ellipse helpers
#
def get_ellipses(shape):
	return shape.findall('./foreground/ellipse')

#
# Round Rect helpers
#
def get_roundrects(shape):
	return shape.findall('./foreground/roundrect')


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
		scrape_height_width_obj(ellipse, data, is_first_path_x, is_first_path_y)
	for roundrect in get_roundrects(shape):
		scrape_height_width_obj(roundrect, data, is_first_path_x, is_first_path_y)
			
	is_first_path_x = True
	is_first_path_y = True

	#print("minx = {min_x}, max_x = {max_x}, min_y = {min_y}, max_y = {max_y}".format(min_x=data['min_x'], max_x=data['max_x'], min_y=data['min_y'], max_y=data['max_y']))

	assert (data['min_y'] <= data['max_y']), "y-coords messed up!"
	assert (data['min_x'] <= data['max_x']), "x-coords messed up!"

	return data

def scrape_height_width_obj(obj, data, is_first_path_x, is_first_path_y):
	x = float(get_obj_attrib(obj, 'x'))
	y = float(get_obj_attrib(obj, 'y'))
	w = float(get_obj_attrib(obj, 'w'))
	h = float(get_obj_attrib(obj, 'h'))
	# Look for minimum x,y
	calc_mins(is_first_path_x, is_first_path_y, x, y, data)
	# Look for maximum x,y
	calc_maxes(x, y, w, h, data)

def calc_mins(is_first_path_x, is_first_path_y, x, y, data):
	if is_first_path_x:
		data['min_x'] = x
		is_first_path_x = False
	elif data['min_x'] > x:
		data['min_x'] = x
	if is_first_path_y:
		is_first_path_y = False
	elif data['min_y'] > y:
		data['min_y'] = y

def calc_maxes(x, y, w, h, data):
	if data['max_x'] < x + w:
		data['max_x'] = x + w
	if data['max_y'] < y + h:
		data['max_y'] = y + h



if __name__ == '__main__':
	main()