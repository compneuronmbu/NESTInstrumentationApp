import threading
import time
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm
import nest


class observe_slot(threading.Thread):

    def __init__(self, slot, message_type, callback):
        super(observe_slot, self).__init__()
        self.slot = slot
        self.msg = message_type
        self.last_message = None
        self.state = False
        self.last_message = None
        self.callback = callback

    def get_last_message(self):
        return self.last_message

    def set_state(self, state):
        self.state = state

    def run(self):
        while True:
            self.msg.ParseFromString(self.slot.receive())
            if self.msg.value is not None:
                self.last_message = self.msg.value
                self.callback(self.msg)
            self.state = not self.state
            self.last_message = self.msg


def handle_reset(msg):
    print("RESET_KERNEL")
    nest.ResetKernel()


def main():
    nett.initialize('tcp://127.0.0.1:8000')

    slot_in_reset = nett.slot_in_float_message()
    slot_in_network = nett.slot_in_string_message()
    slot_in_reset.connect('tcp://127.0.0.1:2001', 'reset')
    slot_in_network.connect('tcp://127.0.0.1:2001', 'network')
    observe_slot_reset = observe_slot(slot_in_reset,
                                      fm.float_message(),
                                      handle_reset)
    observe_slot_network = observe_slot(slot_in_network,
                                        sm.string_message(),
                                        None)
    print('Client starting to observe')
    observe_slot_reset.start()
    observe_slot_network.start()

    #while 1:
        #print(observe_string_slot.new_message)
        #if observe_string_slot.new_message: # funker visst ikke..
        #print(observe_string_slot.get_last_message())
        #time.sleep(0.3)


if __name__ == '__main__':
    print("Main socket")
    main()
