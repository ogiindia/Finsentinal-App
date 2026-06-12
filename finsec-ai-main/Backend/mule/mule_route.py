from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import os
from config import FILE_DIR
import networkx as nx
from database import get_db
from model import AlsalamTrans
from sqlalchemy.orm import Session
from fastapi import Depends
from utils.log_utils import session_logger as logger
from datetime import datetime
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from collections import defaultdict

mule_route = APIRouter(prefix='/mule', tags=['Mule'])

# Define file paths - update these to your actual paths
STACK_PATTERN_FILE = os.path.join(FILE_DIR, 'Stack_pattern_Mule_Acc.csv')
GATHER_PATTERN_FILE = os.path.join(FILE_DIR, 'Gather_pattern_mule_Acc.csv')
CYCLE_PATTERN_FILE = os.path.join(FILE_DIR, 'Cycle_pattern_muleACC.csv')

@mule_route.get('/patterns')
def get_patterns():
    """Get list of available mule patterns"""
    try:
        return JSONResponse({
            'patterns': [
                {'id': 'stack', 'name': 'Stack Pattern'},
                {'id': 'gather', 'name': 'Gather Pattern'},
                {'id': 'cycle', 'name': 'Cycle Pattern'}
            ]
        })
    except Exception as e:
        logger.log_error(message=f"Something went wrong: {e}")
        return JSONResponse({
            "Status": "Failed",
            "message": e
        })

@mule_route.get('/pattern/{pattern_type}')
def get_pattern_data(pattern_type: str):
    """Get transaction data for a specific pattern"""
    try:
        # Map pattern type to file path
        file_paths = {
            'stack': STACK_PATTERN_FILE,
            'gather': GATHER_PATTERN_FILE,
            'cycle': CYCLE_PATTERN_FILE
        }
        
        if pattern_type not in file_paths:
            raise HTTPException(status_code=404, detail=f"Pattern type '{pattern_type}' not found")
        
        file_path = file_paths[pattern_type]
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Data file not found for pattern '{pattern_type}'")
        
        df = pd.read_csv(file_path)
        
        # Replace NaN values with None
        df = df.where(pd.notna(df), None)
        
        # Process data for network visualization
        nodes = set()
        edges = []
        
        for idx, row in df.iterrows():
            sender = str(row['Account']) if row['Account'] is not None else f"Unknown_{idx}_sender"
            receiver = str(row['Account1']) if row['Account1'] is not None else f"Unknown_{idx}_receiver"
            
            nodes.add(sender)
            nodes.add(receiver)
            
            edge = {
                'id': f"edge_{idx}",
                'source': sender,
                'target': receiver,
                'timestamp': str(row['Timestamp']) if row['Timestamp'] is not None else 'N/A',
                'from_bank': int(row['From Bank']) if row['From Bank'] is not None else 0,
                'to_bank': int(row['To Bank ']) if row['To Bank '] is not None else 0,
                'amount_received': float(row['Amount Received ']) if row['Amount Received '] is not None and not pd.isna(row['Amount Received ']) else 0.0,
                'receiving_currency': str(row['Receiving Currency']) if row['Receiving Currency'] is not None else 'N/A',
                'amount_paid': float(row['Amount Paid']) if row['Amount Paid'] is not None and not pd.isna(row['Amount Paid']) else 0.0,
                'payment_currency': str(row['Payment Currency']) if row['Payment Currency'] is not None else 'N/A',
                'payment_format': str(row['Payment Format']) if row['Payment Format'] is not None else 'N/A',
                'is_laundering': int(row['Is Laundering']) if row['Is Laundering'] is not None and not pd.isna(row['Is Laundering']) else 0
            }
            edges.append(edge)
        
        nodes_list = [{'id': node, 'label': node} for node in nodes]
        
        return JSONResponse({
            'pattern_type': pattern_type,
            'nodes': nodes_list,
            'edges': edges,
            'total_transactions': len(edges)
        })
        
    except Exception as e:
        logger.log_error(message=f"Something went wrong: {e}")
        return JSONResponse({
            "Status": "Failed",
            "message": e
        })

@mule_route.get('/health')
def health_check():
    try:
        """Health check endpoint for mule route"""
        return JSONResponse({'status': 'Mule route is operational'})
    except Exception as e:
        logger.log_error(message=f"Something went wrong: {e}")
        return JSONResponse({
            "Status": "Failed",
            "message": e
        })

# @mule_route.get('/mule_network')
# def mule_account(session: Session = Depends(get_db)):
#     G = nx.Graph()

#     try:
#         alsalam_count = session.query(AlsalamTrans).count()

#         if alsalam_count == 0:
#             return JSONResponse({'data': {}, 'message': "No Alsalam transaction data found"})

#         # Add Alsalam edges
#         alsalam_edges = (
#             session.query(
#                 AlsalamTrans.Customer_Id,
#                 AlsalamTrans.To_Customer_Id
#             )
#             .filter(
#                 AlsalamTrans.Customer_Id.isnot(None),
#                 AlsalamTrans.To_Customer_Id.isnot(None)
#             )
#             .order_by(AlsalamTrans.Timestamp.desc(), AlsalamTrans.id.desc())  # newest first
#             .limit(10000)
#             .all()
#         )

#         alsalam_edges = [(str(row[0]), str(row[1])) for row in alsalam_edges]

#         edges = alsalam_edges

#         if not edges:
#             return JSONResponse({'data': {}, 'message': "No Alsalam transaction data found"})

#         # Calculate transaction counts
#         transaction_counts = {}
#         for u, v in edges:
#             transaction_counts[u] = transaction_counts.get(u, 0) + 1
#             transaction_counts[v] = transaction_counts.get(v, 0) + 1

#         # Get top 10% of accounts
#         # sorted_accounts = sorted(transaction_counts.items(), key=lambda x: x[1], reverse=True)
#         # top_10_percent_count = max(1, int(len(sorted_accounts) * 0.1))
#         # top_accounts = set([acc[0] for acc in sorted_accounts[:top_10_percent_count]])

#         sorted_accounts = sorted(transaction_counts.items(), key=lambda x: x[1], reverse=True)
#         # print(sorted_accounts)
#         # top_10_percent_count = max(1, int(len(sorted_accounts) * 0.1))
#         top_accounts = set([acc[0] for acc in sorted_accounts if acc[1]>60])

#         # Create graph with all edges
#         G.add_edges_from(edges)

#         # Get all connected nodes starting from top accounts
#         connected_nodes = set(top_accounts)
#         nodes_to_process = list(top_accounts)
#         processed_nodes = set()

#         while nodes_to_process:
#             current_node = nodes_to_process.pop(0)
#             if current_node not in processed_nodes:
#                 neighbors = list(G.neighbors(current_node))
#                 connected_nodes.update(neighbors)
#                 nodes_to_process.extend([n for n in neighbors if n not in processed_nodes])
#                 processed_nodes.add(current_node)

#         # Get all edges between the connected nodes
#         filtered_edges = []
#         for u, v in edges:
#             if u in connected_nodes or v in connected_nodes:
#                 connected_nodes.add(u)
#                 connected_nodes.add(v)
#                 if u in top_accounts and v in top_accounts:
#                     edge_type = "high-volume"
#                 elif u in top_accounts:
#                     edge_type = "outgoing"
#                 elif v in top_accounts:
#                     edge_type = "incoming"
#                 else:
#                     edge_type = "indirect"
#                 filtered_edges.append({
#                     "source": str(u),
#                     "target": str(v),
#                     "type": edge_type,
                    
#                 })

#         # Calculate layout positions
#         # subgraph = G.subgraph(connected_nodes)
#         # pos = nx.spring_layout(subgraph, k=0.5, iterations=50, seed=42)

#         # positions = {str(node): {'x': float(coord[0]), 'y': float(coord[1])}
#         #              for node, coord in pos.items()}

#         # Prepare node information
#         node_info = {
#             str(node): {
#                 'transaction_count': transaction_counts.get(node, 0),
#                 'is_top': node in top_accounts,
#                 'connections': len([e for e in filtered_edges if str(node) in (str(e['source']), str(e['target']))])
#             } for node in connected_nodes
#         }

#         initial_data = {
#             "nodes": [str(x) for x in connected_nodes],
#             "edges": filtered_edges,
#             # "positions": positions,
#             "node_info": node_info
#         }

#         # logger.log_info(f"Node Data: {initial_data}")
#         logger.log_info(f"Length of edges: {len(filtered_edges)}")
#         return JSONResponse({'data': initial_data})
#     except Exception as e:
#         logger.log_error(message=f"Something went wrong: {e}")
#         return JSONResponse({'data': {}, 'message': "Error analyzing Alsalam transaction data"})
#     finally:
#         session.close()


def compute_mule_network_nodes(session: Session):
    """
    Returns:
      connected_nodes: set[str]
      transaction_counts: dict[str, int]
      top_accounts: set[str]
    """

    # Fetch edges (same as mule_network)
    edges = (
        session.query(
            AlsalamTrans.Customer_Id,
            AlsalamTrans.To_Customer_Id
        )
        .filter(
            AlsalamTrans.Customer_Id.isnot(None),
            AlsalamTrans.To_Customer_Id.isnot(None)
        )
        .order_by(AlsalamTrans.Timestamp.desc(), AlsalamTrans.id.desc())
        # .limit(10000)
        .all()
    )

    edges = [(str(u), str(v)) for u, v in edges]

    # Transaction counts
    transaction_counts = {}
    for u, v in edges:
        transaction_counts[u] = transaction_counts.get(u, 0) + 1
        transaction_counts[v] = transaction_counts.get(v, 0) + 1

    # Same TOP logic
    sorted_accounts = sorted(
        transaction_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )
    top_accounts = {acc for acc, cnt in sorted_accounts if cnt > 60}

    # Graph traversal (same logic)
    G = nx.Graph()
    G.add_edges_from(edges)

    connected_nodes = set(top_accounts)
    nodes_to_process = list(top_accounts)
    processed = set()

    while nodes_to_process:
        node = nodes_to_process.pop(0)
        if node in processed:
            continue
        neighbors = list(G.neighbors(node))
        connected_nodes.update(neighbors)
        nodes_to_process.extend(n for n in neighbors if n not in processed)
        processed.add(node)

    return connected_nodes, transaction_counts, top_accounts, edges




@mule_route.get("/mule_network")
def mule_network(session: Session = Depends(get_db)):
    try:
        connected_nodes, transaction_counts, top_accounts, edges = (
            compute_mule_network_nodes(session)
        )

        filtered_edges = []
        for u, v in edges:
            if u in connected_nodes or v in connected_nodes:
                if u in top_accounts and v in top_accounts:
                    edge_type = "high-volume"
                elif u in top_accounts:
                    edge_type = "outgoing"
                elif v in top_accounts:
                    edge_type = "incoming"
                else:
                    edge_type = "indirect"

                filtered_edges.append({
                    "source": u,
                    "target": v,
                    "type": edge_type
                })

        node_info = {
            node: {
                "transaction_count": transaction_counts.get(node, 0),
                "is_top": node in top_accounts,
                "connections": sum(
                    1 for e in filtered_edges
                    if node in (e["source"], e["target"])
                )
            }
            for node in connected_nodes
        }

        return {
            "data": {
                "nodes": list(connected_nodes),
                "edges": filtered_edges,
                "node_info": node_info
            }
        }

    finally:
        session.close()





@mule_route.get("/mule_network_nodes")
def mule_network_nodes(
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_db)
):
    try:
        connected_nodes, transaction_counts, top_accounts, _ = (
            compute_mule_network_nodes(session)
        )

        nodes = sorted(list(connected_nodes))
        total = len(nodes)

        start = (page - 1) * page_size
        end = start + page_size

        page_nodes = nodes[start:end]

        return {
            "data": [
                {
                    "node_id": node,
                    "transaction_count": transaction_counts.get(node, 0),
                    "is_top": node in top_accounts
                }
                for node in page_nodes
            ],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total
            }
        }

    finally:
        session.close()

@mule_route.get("/mule_network_table")
def mule_network_table(
    page: int = 1,
    page_size: int = 10,
    session: Session = Depends(get_db),
):
    try:
        # ---------- SAME DATA SOURCE ----------
        alsalam_edges = (
            session.query(
                AlsalamTrans.Customer_Id,
                AlsalamTrans.To_Customer_Id
            )
            .filter(
                AlsalamTrans.Customer_Id.isnot(None),
                AlsalamTrans.To_Customer_Id.isnot(None)
            )
            .order_by(AlsalamTrans.Timestamp.desc(), AlsalamTrans.id.desc())
            # .limit(10000)
            .all()
        )

        edges = [(str(u), str(v)) for u, v in alsalam_edges]

        if not edges:
            return {"data": {}, "total": 0}

        # ---------- SAME TRANSACTION COUNT LOGIC ----------
        transaction_counts = {}
        for u, v in edges:
            transaction_counts[u] = transaction_counts.get(u, 0) + 1
            transaction_counts[v] = transaction_counts.get(v, 0) + 1

        # ---------- SAME TOP ACCOUNT LOGIC ----------
        sorted_accounts = sorted(
            transaction_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        top_accounts = {acc for acc, cnt in sorted_accounts if cnt > 60}

        # ---------- SAME GRAPH EXPANSION ----------
        G = nx.Graph()
        G.add_edges_from(edges)

        connected_nodes = set(top_accounts)
        queue = list(top_accounts)
        visited = set()

        while queue:
            node = queue.pop(0)
            if node in visited:
                continue
            visited.add(node)
            neighbors = list(G.neighbors(node))
            for n in neighbors:
                if n not in visited:
                    connected_nodes.add(n)
                    queue.append(n)

        all_nodes = sorted(connected_nodes)

        # ---------- PAGINATION ----------
        total = len(all_nodes)
        start = (page - 1) * page_size
        end = start + page_size
        page_nodes = all_nodes[start:end]

        # ---------- EDGE SUBSET FOR TABLE (OPTIONAL) ----------
        page_edges = [
            {
                "source": u,
                "target": v,
                "type": (
                    "high-volume" if u in top_accounts and v in top_accounts
                    else "outgoing" if u in top_accounts
                    else "incoming" if v in top_accounts
                    else "indirect"
                )
            }
            for u, v in edges
            if u in page_nodes or v in page_nodes
        ]

        # ---------- NODE INFO ----------
        node_info = {
            node: {
                "transaction_count": transaction_counts.get(node, 0),
                "is_top": node in top_accounts,
                "connections": len([
                    e for e in page_edges
                    if node in (e["source"], e["target"])
                ])
            }
            for node in page_nodes
        }

        return {
            "data": {
                "nodes": page_nodes,
                "edges": page_edges,
                "node_info": node_info,
            },
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    except Exception as e:
        logger.log_error(f"Table API error: {e}")
        return {"data": {}, "total": 0}
    finally:
        session.close()

@mule_route.get('/get_filtered_graph')
def get_filtered_graph(node_id: str, session: Session = Depends(get_db)):
    G = nx.Graph()

    try:
        alsalam_count = session.query(AlsalamTrans).count()

        if alsalam_count == 0:
            return JSONResponse({'data': {}, 'error': "No Alsalam transaction data found"})

        # ORM edges
        transaction_edges = (session.query(AlsalamTrans.Customer_Id, AlsalamTrans.To_Customer_Id)
            .filter(AlsalamTrans.Customer_Id.isnot(None), AlsalamTrans.To_Customer_Id.isnot(None))
            # .limit(10000)
            .all())
        transaction_edges = [(str(row[0]), str(row[1])) for row in transaction_edges]


        edges = transaction_edges

        if not edges:
            return JSONResponse({'data': {}, 'error': "No Alsalam transaction data found"})

        # Calculate transaction counts
        transaction_counts = {}
        for u, v in edges:
            transaction_counts[u] = transaction_counts.get(u, 0) + 1
            transaction_counts[v] = transaction_counts.get(v, 0) + 1

        # Get top 10% of accounts
        sorted_accounts = sorted(transaction_counts.items(), key=lambda x: x[1], reverse=True)
        # top_10_percent = set([acc[0] for acc in sorted_accounts[:max(1, int(len(sorted_accounts) * 0.1))]])
        sorted_accounts = sorted(transaction_counts.items(), key=lambda x: x[1], reverse=True)
        # print(sorted_accounts)
        # top_10_percent_count = max(1, int(len(sorted_accounts) * 0.1))
        top_10_percent = set([acc[0] for acc in sorted_accounts if acc[1]>60])

        G.add_edges_from(edges)

        if node_id == 'all':
            # Get connected component of top accounts
            connected_nodes = set(top_10_percent)
            nodes_to_process = list(top_10_percent)
            processed_nodes = set()
            while nodes_to_process:
                current_node = nodes_to_process.pop(0)
                if current_node not in processed_nodes:
                    neighbors = list(G.neighbors(current_node))
                    connected_nodes.update(neighbors)
                    nodes_to_process.extend([n for n in neighbors if n not in processed_nodes])
                    processed_nodes.add(current_node)

            filtered_edges = []
            for u, v in edges:
                if u in connected_nodes or v in connected_nodes:
                    connected_nodes.add(u)
                    connected_nodes.add(v)
                    edge_type = "high-volume" if (u in top_10_percent and v in top_10_percent) else \
                        ("outgoing" if u in top_10_percent else ("incoming" if v in top_10_percent else "indirect"))
                    filtered_edges.append({
                        "source": str(u),
                        "target": str(v),
                        "type": edge_type
                    })
        else:
            if node_id not in G:
                return JSONResponse({
                    'nodes': [],
                    'edges': [],
                    'positions': {},
                    'error': f'Node {node_id} not found'
                })

            connected_nodes = {node_id}
            nodes_to_process = [node_id]
            processed_nodes = set()

            while nodes_to_process:
                current_node = nodes_to_process.pop(0)
                if current_node not in processed_nodes:
                    neighbors = list(G.neighbors(current_node))
                    connected_nodes.update(neighbors)
                    nodes_to_process.extend([n for n in neighbors if n not in processed_nodes])
                    processed_nodes.add(current_node)

            filtered_edges = []
            for u, v in edges:
                if u in connected_nodes and v in connected_nodes:
                    if u == node_id:
                        edge_type = "outgoing"
                    elif v == node_id:
                        edge_type = "incoming"
                    elif u in top_10_percent or v in top_10_percent:
                        edge_type = "high-volume"
                    else:
                        edge_type = "indirect"
                    filtered_edges.append({
                        "source": str(u),
                        "target": str(v),
                        "type": edge_type
                    })

        # pos = nx.spring_layout(G.subgraph(connected_nodes), k=0.5, iterations=50, seed=42)
        # positions = {str(node): {'x': float(coord[0]), 'y': float(coord[1])}
        #              for node, coord in pos.items()}

        node_data = {
            'nodes': [str(x) for x in connected_nodes],
            'edges': filtered_edges,
            # 'positions': positions,
            'node_info': {
                str(node): {
                    'transaction_count': transaction_counts.get(node, 0),
                    'is_top': node in top_10_percent,
                    'connections': len([e for e in filtered_edges if str(node) in (str(e['source']), str(e['target']))])
                } for node in connected_nodes
            }
        }
        logger.log_info(f"Length of edges: {len(filtered_edges)}")
        # logger.log_info(f"Node Data: {node_data}")
        return JSONResponse({"data":node_data})
    except Exception as e:
        logger.log_error(f"'error': f'Error processing request: {str(e)}', 'nodes': [], 'edges': [], 'positions': []")
        return JSONResponse({
            'error': f'Error processing request: {str(e)}',
            'nodes': [],
            'edges': [],
            'positions': {}
        })
    finally:
        session.close()

# Legacy POST endpoints (keeping for backward compatibility)
@mule_route.post('/pattern')
def pattern():
    try:
        return JSONResponse({
            'Patterns': ['stack', 'gather', 'cycle']
        })
    except Exception as e:
        logger.log_error(message=f"Something went wrong: {e}")
        return JSONResponse({
            "Status": "Failed",
            "message": e
        })
    

@mule_route.post('/pattern/stack')
def stack_pattern():
    try:
        df = pd.read_csv(STACK_PATTERN_FILE)
        return JSONResponse(df.to_json(orient='records'))
    except Exception as e:
        logger.log_error(message=f"Something went wrong: {e}")
        return JSONResponse({
            "Status": "Failed",
            "message": e
        })

@mule_route.post('/pattern/gather')
def gather_pattern():
    try:
        df = pd.read_csv(GATHER_PATTERN_FILE)
        return JSONResponse(df.to_json(orient='records'))
    except Exception as e:
        logger.log_error(message=f"Something went wrong: {e}")
        return JSONResponse({
            "Status": "Failed",
            "message": e
        })

@mule_route.post('/pattern/cycle')
def cycle_pattern():
    try:
        df = pd.read_csv(CYCLE_PATTERN_FILE)
        return JSONResponse(df.to_json(orient='records'))
    except Exception as e:
        logger.log_error(message=f"Something went wrong: {e}")
        return JSONResponse({
            "Status": "Failed",
            "message": e
        })
    
@mule_route.get("/mule_cluster")
def mule_cluster(db: Session = Depends(get_db)):

    try:
        transactions = (
            db.query(AlsalamTrans)
            .filter(AlsalamTrans.Amount > 0)
            .order_by(AlsalamTrans.Customer_Id, AlsalamTrans.Timestamp)
            .all()
        )

        if len(transactions) < 2:
            return JSONResponse(
                {"error": "Not enough data for clustering"},
                status_code=400
            )

        customer_last_time = {}
        customer_counterparties = defaultdict(set)
        customer_locations = defaultdict(set)

        feature_rows = []

        for tx in transactions:
            cust_id = tx.Customer_Id
            ts: datetime = tx.Timestamp

            time_of_day = ts.hour + ts.minute / 60.0

            if cust_id in customer_last_time:
                time_since_last_tx = (ts - customer_last_time[cust_id]).total_seconds() / 60.0
            else:
                time_since_last_tx = 0.0

            customer_last_time[cust_id] = ts

            if tx.To_Customer_Id:
                customer_counterparties[cust_id].add(tx.To_Customer_Id)

            if tx.Location:
                customer_locations[cust_id].add(tx.Location)

            feature_rows.append({
                "amount": float(tx.Amount),
                "time_of_day": time_of_day,
                "time_since_last_tx": time_since_last_tx,
                "unique_counterparty_count": len(customer_counterparties[cust_id]),
                "location_switch_count": len(customer_locations[cust_id]),
                "accountId1": tx.Customer_Id,
                "accountId2": tx.To_Customer_Id or "",
                "timestamp": ts.isoformat(),
                "terminalId": tx.Location or "",
                "merchantName": tx.Location or ""
            })

        X = np.array([
            [
                r["amount"],
                r["time_of_day"],
                r["time_since_last_tx"],
                r["unique_counterparty_count"],
                r["location_switch_count"]
            ]
            for r in feature_rows
        ])

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        n_clusters = min(5, len(X))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)

        centers = scaler.inverse_transform(kmeans.cluster_centers_)

        cluster_groups = defaultdict(list)

        for idx, label in enumerate(labels):
            cluster_groups[int(label)].append({
                **feature_rows[idx],
                "cluster": int(label)
            })

        cluster_centers = [
            {
                "cluster": int(i),
                "amount": float(center[0]),
                "timeOfDay": float(center[1]),
                "avgTimeGap": float(center[2]),
                "avgCounterparties": float(center[3]),
                "avgLocationSwitch": float(center[4]),
                "count": len(cluster_groups.get(i, []))
            }
            for i, center in enumerate(centers)
        ]

        cluster_summary = []
        for cid, rows in cluster_groups.items():
            cluster_summary.append({
                "cluster": cid,
                "count": len(rows),
                "avgAmount": sum(r["amount"] for r in rows) / len(rows),
                "avgTimeGap": sum(r["time_since_last_tx"] for r in rows) / len(rows),
                "uniqueCustomers": len(set(r["accountId1"] for r in rows))
            })

        return JSONResponse({
            "clusterGroups": cluster_groups,
            "centers": cluster_centers,
            "summary": cluster_summary,
            "error": None
        })

    except Exception as e:
        return JSONResponse(
            {"error": f"Mule clustering failed: {str(e)}"},
            status_code=500
        )