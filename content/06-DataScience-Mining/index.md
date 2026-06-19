---
title: Data Science & Mining
---


Data analysis pipeline + mining algorithms.

## Prerequisites

- Statistics — distributions, hypothesis testing, Bayes' rule
- Linear algebra — vectors, matrices, eigen-decomposition
- Calculus — gradients (for optimization-based models)
- Programming — Python (numpy, pandas, scikit-learn) or R
- Basic algorithms (trees, hashing, sorting)

## Learning path

1. **Data preparation** — cleaning, missing values, encoding
2. **EDA** — descriptive stats + visualization
3. **Supervised learning** — regression first, then classification
4. **Unsupervised** — clustering, association rules
5. **Evaluation & validation** — metrics, cross-validation, error analysis
6. **Dimensionality reduction & feature engineering**
7. **Ensembles & modern models** — random forests, gradient boosting, neural nets
8. **Deployment & ethics** — serving, drift, bias / fairness

## Topics

- **Data preparation** — cleaning, normalization / standardization, missing-value imputation, outlier detection, categorical encoding
- **EDA** — descriptive stats, distributions, correlation, visualizations (histograms, box plots, scatter matrix)
- **Regression** — linear, polynomial, ridge / lasso, logistic
- **Classification** — decision trees, kNN, Naive Bayes, SVM, logistic regression
- **Ensembles** — bagging, random forests, AdaBoost, gradient boosting (XGBoost, LightGBM)
- **Neural networks** — perceptron, MLP, backprop, regularization, dropout
- **Clustering** — k-means, hierarchical (agglomerative / divisive), DBSCAN, Gaussian mixture
- **Association rules** — Apriori, FP-Growth, support / confidence / lift
- **Evaluation** — confusion matrix, precision / recall / F1, ROC / AUC, cross-validation, bias-variance
- **Dimensionality reduction** — PCA, LDA, t-SNE, UMAP, autoencoders
- **Feature engineering** — selection, extraction, scaling
- **Time series** — trend, seasonality, ARIMA, exponential smoothing
- **Pipelines & MLOps** — train/test/serve split, model registry, drift, monitoring

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**Common metrics**

| Metric         | Formula                                | Use when                          |
| -------------- | -------------------------------------- | --------------------------------- |
| Accuracy       | (TP+TN) / (TP+TN+FP+FN)               | balanced classes                  |
| Precision      | TP / (TP+FP)                           | cost of false positives is high   |
| Recall (TPR)   | TP / (TP+FN)                           | missing positives is expensive    |
| F1             | 2 · P · R / (P + R)                    | balance precision & recall        |
| ROC-AUC        | area under TPR vs FPR curve            | threshold-independent ranking     |
| MSE / RMSE     | mean of (y − ŷ)²  /  √MSE              | regression                        |
| MAE            | mean of \|y − ŷ\|                       | regression, robust to outliers    |

**Algorithm pick (quick heuristic)**

| Task                | Try first              | If size big          |
| ------------------- | ---------------------- | -------------------- |
| Tabular regression  | Linear / GBM           | LightGBM             |
| Tabular classify    | Logistic / GBM         | XGBoost              |
| Text                | TF-IDF + Linear        | Transformer FT       |
| Images              | CNN                    | Pretrained CNN/ViT   |
| Clustering          | k-means                | mini-batch k-means   |

**Curse of dimensionality:** sample density drops exponentially with feature count → prefer feature selection / reduction over kitchen-sink features.

</details>

## Resources

- *An Introduction to Statistical Learning* (ISL/ISLR) — James, Witten, Hastie, Tibshirani (free PDF)
- *The Elements of Statistical Learning* (ESL) — Hastie, Tibshirani, Friedman (advanced)
- *Pattern Recognition and Machine Learning* — Bishop
- *Data Mining: Concepts and Techniques* — Han, Kamber, Pei
- Andrew Ng — Machine Learning Specialization (Coursera) + Deep Learning Specialization
- scikit-learn docs (worked examples for every algorithm)

## Drawings

- [[Data-Science.excalidraw|Data Science]]
- [[Data-Mining.excalidraw|Data Mining]]
