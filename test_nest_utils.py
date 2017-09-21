import time
import nest_utils as nu

ni = nu.NESTInterface({})
print('Waiting a few seconds before terminating..')
time.sleep(3)
ni.terminate_nest_client()
