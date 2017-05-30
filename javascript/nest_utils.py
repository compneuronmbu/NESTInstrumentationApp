import nest.topology as tp


def make_mask(lower_left, upper_right, mask_type, cntr):
    """
    Makes a mask from the specifications.

    :param lower_left: Coordinates for lower left of the selection.
    :param upper_right: Coordinates for upper right of the selection.
    :param mask_type: Shape of the mask. Either ``rectangle`` or
                      ``ellipse``.
    :param cntr: Coordinates for the center of the layer.
    :returns: A NEST ``Mask`` object.
    """

    if mask_type == 'rectangle':
        mask_t = 'rectangular'
        spec = {'lower_left': [lower_left[0] - cntr[0],
                               lower_left[1] - cntr[1]],
                'upper_right': [upper_right[0] - cntr[0],
                                upper_right[1] - cntr[1]]}
    elif mask_type == 'ellipse':
        mask_t = 'elliptical'
        # Calculate center of ellipse
        xpos = (upper_right[0] + lower_left[0]) / 2.0
        ypos = (upper_right[1] + lower_left[1]) / 2.0
        # Find major and minor axis
        x_side = upper_right[0] - lower_left[0]
        y_side = upper_right[1] - lower_left[1]
        if x_side >= y_side:
            angle = 0.0
            major = x_side
            minor = y_side
        else:
            angle = 90.
            major = y_side
            minor = x_side
        spec = {'major_axis': major, 'minor_axis': minor,
                'anchor': [xpos - cntr[0], ypos - cntr[1]],
                'azimuth_angle': angle}
    else:
        raise ValueError('Invalid mask type: %s' % mask_type)

    mask = tp.CreateMask(mask_t, spec)

    return mask
