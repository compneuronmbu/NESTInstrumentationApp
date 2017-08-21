import define_brunel_3D_quasi_random
import toJSON
import pprint

layer_specs = define_brunel_3D_quasi_random.make_layers()
conn_specs = define_brunel_3D_quasi_random.make_connections()

# print("##############################")
# pprint.pprint(layer_specs)
# print("##############################")
# pprint.pprint(conn_specs)
# print("##############################")
print("Making JSON...")
toJSON.convert(layer_specs, conn_specs, 'brunel_3D_converted_quasi_random')
