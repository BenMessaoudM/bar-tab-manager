Bar Tab Manager

A simple bar tab tracker for small clubs/teams.
Admins (superusers) can create workers & drinks, print receipts, and manage customers.
Workers can select a customer and add drink charges or payments with one click.

Live demo (example):

    Frontend: GitHub Pages (static)

    Backend API: Render (Node/Express) + MongoDB Atlas

Features

    🔐 JWT-based login (superuser / worker)

    👤 Customers: add/delete, running balance, session total, warning on large negative balances

    🍺 Drinks: configurable list (name, price, active), quick-add buttons for charges

    💳 Payments & custom charges (auto negative for non-payment descriptions)
