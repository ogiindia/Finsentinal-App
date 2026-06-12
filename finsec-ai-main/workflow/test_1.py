import pandas as pd

df = pd.read_csv("/storage/AIML/MLDashboard/MLpipe-v2/Backend/component/synthetic_train_with_anomaly_score.csv")
df = df.drop(['anomaly_score'], axis=1)
df.to_csv("/storage/AIML/MLDashboard/MLpipe-v2/Backend/component/synthetic_train_with_anomaly_score_1.csv", index=False)