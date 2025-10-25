#!/usr/bin/env python3
"""
Seed Performance Data - Python Script
Adds realistic campaign performance data to enable percentile rankings
"""

import sqlite3
import random
import string
from datetime import datetime, timedelta

def generate_id(size=16):
    """Generate nanoid-like ID"""
    alphabet = string.ascii_letters + string.digits + '-_'
    return ''.join(random.choice(alphabet) for _ in range(size))

def main():
    print('🌱 Seeding performance data to dm-tracking.db\n')

    conn = sqlite3.connect('dm-tracking.db')
    cursor = conn.cursor()

    try:
        # Get existing stores
        cursor.execute("""
            SELECT id, name, size_category
            FROM retail_stores
            WHERE name IN ('Portland Central', 'Phoenix North', 'Downtown Miami Store')
        """)
        stores = cursor.fetchall()

        print(f'Found {len(stores)} existing stores to populate\n')

        if len(stores) == 0:
            print('❌ No stores found!')
            return

        # Get a campaign ID
        cursor.execute('SELECT id FROM campaigns LIMIT 1')
        campaign_row = cursor.fetchone()
        if not campaign_row:
            print('❌ No campaigns found!')
            return

        campaign_id = campaign_row[0]

        # Define performance tiers
        performance_tiers = {
            'Portland Central': {'base_rate': 5.0, 'quantities': [300, 500, 800, 1200, 2000, 3500]},
            'Phoenix North': {'base_rate': 3.0, 'quantities': [300, 500, 800, 1200, 2000, 3500]},
            'Downtown Miami Store': {'base_rate': 2.5, 'quantities': [300, 500, 800, 1200, 2000, 3500]}
        }

        total_deployments = 0
        total_recipients = 0
        total_conversions = 0

        # Process each store
        for store_id, store_name, size_category in stores:
            tier = performance_tiers.get(store_name)
            if not tier:
                continue

            print(f"📊 Processing {store_name} ({tier['base_rate']}% base conversion rate)...")

            # Create campaigns at different quantities
            for i, quantity in enumerate(tier['quantities']):
                deployment_id = generate_id()
                days_ago = 10 + i * 15
                created_at = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')

                # Create deployment
                cursor.execute("""
                    INSERT INTO retail_campaign_deployments
                    (id, campaign_id, store_id, status, created_at, updated_at)
                    VALUES (?, ?, ?, 'completed', ?, datetime('now'))
                """, (deployment_id, campaign_id, store_id, created_at))
                total_deployments += 1

                # Calculate expected conversion rate with diminishing returns
                half_sat = 2000
                saturation_factor = quantity**0.9 / (half_sat**0.9 + quantity**0.9)
                effective_rate = tier['base_rate'] * (0.5 + 0.5 * saturation_factor)

                # Add randomness (±20%)
                noise = (random.random() - 0.5) * 0.4
                actual_rate = max(0.5, effective_rate * (1 + noise))

                # Create recipients
                recipient_tracking_ids = []
                for j in range(quantity):
                    recipient_id = generate_id()
                    tracking_id = generate_id()

                    cursor.execute("""
                        INSERT INTO recipients (id, campaign_id, tracking_id, name, lastname, email, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (recipient_id, campaign_id, tracking_id, f'Customer', f'#{j+1}', f'customer{j}@example.com', created_at))

                    cursor.execute("""
                        INSERT INTO retail_deployment_recipients (id, deployment_id, recipient_id)
                        VALUES (?, ?, ?)
                    """, (generate_id(), deployment_id, recipient_id))

                    recipient_tracking_ids.append(tracking_id)
                    total_recipients += 1

                # Create conversions
                conversion_count = round((quantity * actual_rate) / 100)
                converters = random.sample(recipient_tracking_ids, min(conversion_count, len(recipient_tracking_ids)))

                for tracking_id in converters:
                    cursor.execute("""
                        INSERT INTO conversions (id, tracking_id, conversion_type, created_at)
                        VALUES (?, ?, 'form_submission', ?)
                    """, (generate_id(), tracking_id, created_at))
                    total_conversions += 1

                print(f"  ✓ Campaign {i+1}: {quantity} pieces → {conversion_count} conversions ({actual_rate:.2f}%)")

            print()

        conn.commit()

        print('━' * 80)
        print('✅ Seeding complete!\n')
        print(f'📈 Created:')
        print(f'   - {total_deployments} campaigns')
        print(f'   - {total_recipients} recipients')
        print(f'   - {total_conversions} conversions\n')

        # Verify results
        cursor.execute("""
            SELECT
                s.name,
                COUNT(DISTINCT d.id) as campaigns,
                COUNT(DISTINCT rdr.recipient_id) as recipients,
                COUNT(DISTINCT c.id) as conversions,
                ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT rdr.recipient_id) * 100, 2) as conversion_rate
            FROM retail_stores s
            LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
            LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
            LEFT JOIN recipients r ON rdr.recipient_id = r.id
            LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
            WHERE s.name IN ('Portland Central', 'Phoenix North', 'Downtown Miami Store')
            GROUP BY s.id
            ORDER BY conversion_rate DESC
        """)

        stats = cursor.fetchall()

        print('📊 Final Performance Rankings:\n')
        print('Store                     | Campaigns | Recipients | Conversions | Rate')
        print('─' * 80)
        for name, campaigns, recipients, conversions, rate in stats:
            print(f'{name:<25} | {campaigns:>9} | {recipients:>10} | {conversions:>11} | {rate}%')

        print('\n🎯 Percentile rankings should now work properly!')
        print('💡 Test in the Planning Workspace by overriding quantities.\n')

    except Exception as e:
        print(f'❌ Error seeding data: {e}')
        conn.rollback()
        return 1
    finally:
        conn.close()

    return 0

if __name__ == '__main__':
    exit(main())
