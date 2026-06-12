import pandas as pd

df = pd.read_csv("/storage/AIML/MLDashboard/MLpipe-v2/Backend/Outfiles/dcdb1f8f-d057-4442-8127-506950fae4ba/part-00000-eb6a1e23-b632-44c7-91f7-7066bb9f823e-c000.csv")
print(df.count())