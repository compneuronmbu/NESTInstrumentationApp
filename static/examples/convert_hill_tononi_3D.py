import define_hill_tononi_3D
import toJSON
import pprint

layer_specs = define_hill_tononi_3D.make_layers()
conn_specs = []#define_hill_tononi_3D.make_connections()

print("##############################")
#pprint.pprint(layer_specs)
print("##############################")
#pprint.pprint(conn_specs)
print("##############################")
toJSON.convert(layer_specs, conn_specs, 'hill_tononi_3D_converted')