# -*- coding: utf-8 -*-
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import json
import sys
import os

# Create charts directory
os.makedirs('static/charts', exist_ok=True)

# Get data from command line
data_json = sys.argv[1] if len(sys.argv) > 1 else '{}'
data = json.loads(data_json)

print(f"Generating charts with data: {data.get('total_customers', 0)} customers")

# Chart 1: Risk Level Distribution (Pie Chart)
risk_counts = data.get('risk_counts', {'High': 0, 'Medium': 0, 'Low': 0})
labels = list(risk_counts.keys())
sizes = list(risk_counts.values())
colors = ['#e74c3c', '#f39c12', '#2ecc71']

if sum(sizes) > 0:
    plt.figure(figsize=(8, 6))
    plt.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
    plt.title('Customer Risk Level Distribution')
    plt.savefig('static/charts/risk_pie.png')
    plt.close()
    print("Saved risk_pie.png")

# Chart 2: Risk Level (Bar Chart)
if sum(sizes) > 0:
    plt.figure(figsize=(8, 6))
    plt.bar(labels, sizes, color=colors)
    plt.xlabel('Risk Level')
    plt.ylabel('Number of Customers')
    plt.title('Risk Level Distribution')
    plt.savefig('static/charts/risk_bar.png')
    plt.close()
    print("Saved risk_bar.png")

print("Done!")
