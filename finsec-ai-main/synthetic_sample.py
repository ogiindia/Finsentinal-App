import pandas as pd

df = pd.read_csv(r'C:\AIML\Finsentinel_AI\files\Features_result.csv')

df['transaction_id'] = [i for i in range(1, len(df)+1)]

customer_cols = ['tran_foreign','Device_Change','IP_Change','uni_acc_to_10min','uni_acc_to_1D','tran_ratio_count_10min_1D','tran_ratio_count_1D_30D', 'transaction_id']
df[customer_cols].to_csv('tran.csv', index=False)

order_cols = ['tran_ratio_count_1D_90D','tran_ratio_count_1D_180D','tran_ratio_amount_10min_1D','tran_ratio_amount_1D_30D','tran_ratio_amount_1D_90D','tran_ratio_amount_1D_180D','isoddhr','Tran_avarage_amount_ratio','Label', 'transaction_id']
df[order_cols].to_csv('pers.csv', index=False)

print("Files created successfully!")
print(f"File 1 has columns: {customer_cols}")
print(f"File 2 has columns: {order_cols}")
print(f"Both files have {len(df)} rows with matching transaction_id")
