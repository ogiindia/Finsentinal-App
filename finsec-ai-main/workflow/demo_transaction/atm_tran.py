from iso8583_mode.encoder import encode
from iso8583_mode.specs import default_ascii as specs
import socket
import pandas as pd
from random import choice
from time import sleep
from datetime import datetime
from pytz import timezone
from random import randint


df = pd.read_csv('../dev/Files/csv/bank_customers.csv')
customers = pd.unique(df[["CustomerID"]].values.ravel()).tolist()
for i in range(100):
    c1 = choice(customers)
    c2 = choice(customers)
    while c1 == c2:
        c2 = choice(customers)
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(('127.0.0.1', 8000))
    # Create an ISO8583 message
    message = {
        'h':'.O',
        't': '0200',
        '2': '6080820000001388',
        '3': '010000',
        '4': str(randint(1, 10000)).zfill(12),
        '7': datetime.now(timezone('Asia/Kolkata')).strftime('%m%d%H%M%S'),
        '11': '023100',
        '12': datetime.now(timezone('Asia/Kolkata')).strftime('%H%M%S'),
        '18': '6011',
        '19':'356',
        '22': '051',
        '25': '00',
        '32': '700020',
        '37':'016023483102',
        '38':'023100',
        '39':'05',
        '41':'12345678',
        '42':'1FDBOM226      ',
        '43':'+PORWAL COMPLEX DR B AMTHANE        MHIN',
        '48':'051005ATM0105800500999',
        '49':'356',
        '102':c1,
        '103':c2,
        '120':'AR001Y'
    }

    # message_2=

    # Encode the message
    encoded_message, _ = encode(message, specs)
    # pprint.pp("SHOW ENCODED MESSAGE",encoded_message)
    print("SHOW ENCODED MESSAGE",encoded_message)


    s.sendall(encoded_message)

    s.close()