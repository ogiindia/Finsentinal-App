from flask import Flask, render_template, request, jsonify
from iso8583_mode.specs import default_ascii as specs
import pandas as pd
import socket
from iso8583_mode.encoder import encode
from datetime import datetime

app = Flask(__name__, template_folder='template')

@app.route('/')
def home():
    path = 'bank_customers.csv'
    df = pd.read_csv(path)
    customer = df["CustomerID"].drop_duplicates().to_list()
    print(df)
    return render_template('index.html', customers=customer)

@app.route('/submit', methods=['POST'])
def submit():
    data = request.get_json()
    # if len(data['field_4']) == 12:
    print(data)
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(('127.0.0.1', int(data['port'])))
    # Create an ISO8583 message
    message = {
        'h':'.O',
        't': '0200',
        '2': '6080820000001388',
        '3': '010000',
        '4': data['field_4'].zfill(12),
        '7': data['field_7'],
        '11': '023100',
        '12': str(data['field_7'])[-6:],
        '18': '6011',
        '19':data['field_19'],
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
        '49':data['field_19'],
        '102':data['field_102'],
        '103':data['field_103'],
        '120':'AR001Y'
    }
    print(message)
    # message_2=

    # Encode the message
    encoded_message, _ = encode(message, specs)
    # pprint.pp("SHOW ENCODED MESSAGE",encoded_message)
    print("SHOW ENCODED MESSAGE",encoded_message)
    print(message)

    s.sendall(encoded_message)

    s.close()
    print("Received ISO8583 message:")
    print(data)
    return jsonify({
        "status": "success",
        "message": "ISO8583 message received successfully",
        "data": message
    })

if __name__ == '__main__':
    app.run(port=3000, debug=True)