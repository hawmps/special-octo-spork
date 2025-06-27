# Field Service CRM - Deployment Guide

This guide provides step-by-step instructions for deploying the Field Service CRM system to AWS.

## Prerequisites

Before deploying, ensure you have the following installed and configured:

### Required Tools
- [Node.js](https://nodejs.org/) (v18 or later)
- [Docker](https://www.docker.com/)
- [AWS CLI](https://aws.amazon.com/cli/) (v2)
- [Terraform](https://www.terraform.io/) (v1.5+)
- [Git](https://git-scm.com/)

### AWS Configuration
1. Configure AWS credentials:
   ```bash
   aws configure
   ```
   Or set environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_DEFAULT_REGION=us-east-1
   ```

2. Ensure your AWS account has the necessary permissions for:
   - VPC and networking resources
   - RDS (PostgreSQL)
   - ECS and ECR
   - S3
   - Cognito
   - IAM roles and policies
   - CloudWatch

## Environment Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd field-service-crm
```

### 2. Environment Configuration
Copy the example environment file and configure:
```bash
cp .env.example .env
```

Edit `.env` with your specific values:
```bash
# Database Configuration
DB_PASSWORD=your_secure_password

# AWS Configuration
AWS_REGION=us-east-1

# S3 Configuration
S3_BUCKET_NAME=field-service-crm-files-unique-suffix
```

### 3. Terraform Backend Setup
Create an S3 bucket for Terraform state (one-time setup):
```bash
aws s3 mb s3://field-service-crm-terraform-state-dev --region us-east-1
```

## Deployment Methods

### Method 1: Automated Deployment Script

The easiest way to deploy is using the automated deployment script:

```bash
# Deploy to development environment
./scripts/deploy.sh dev

# Deploy to staging environment
./scripts/deploy.sh staging

# Deploy to production environment
./scripts/deploy.sh prod
```

### Method 2: Manual Deployment

#### Step 1: Deploy Infrastructure
```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform plan -var="db_password=your_secure_password"
terraform apply
```

#### Step 2: Build and Push Docker Images
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -t field-service-crm-backend ./backend
docker tag field-service-crm-backend:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/field-service-crm-backend:latest
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/field-service-crm-backend:latest

# Build and push frontend
docker build -t field-service-crm-frontend ./frontend
docker tag field-service-crm-frontend:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/field-service-crm-frontend:latest
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/field-service-crm-frontend:latest
```

#### Step 3: Run Database Migrations
```bash
cd backend
npm install
npm run migrate
```

## Environment-Specific Configurations

### Development Environment
- Single AZ deployment
- Smaller instance sizes
- Deletion protection disabled
- Debug logging enabled

### Staging Environment
- Multi-AZ deployment
- Production-like instance sizes
- SSL/TLS enabled
- Performance monitoring

### Production Environment
- Multi-AZ deployment with high availability
- Auto-scaling enabled
- Backup and disaster recovery
- Enhanced security settings
- Performance monitoring and alerting

## Post-Deployment Setup

### 1. Create Initial Admin User
After deployment, create the first admin user through the Cognito console or using AWS CLI:

```bash
aws cognito-idp admin-create-user \
    --user-pool-id your-user-pool-id \
    --username admin@yourcompany.com \
    --user-attributes Name=email,Value=admin@yourcompany.com Name=given_name,Value=Admin Name=family_name,Value=User \
    --temporary-password TempPassword123! \
    --message-action SUPPRESS
```

### 2. Add User to Admin Group
```bash
aws cognito-idp admin-add-user-to-group \
    --user-pool-id your-user-pool-id \
    --username admin@yourcompany.com \
    --group-name platform_admin
```

### 3. Load Sample Data (Development Only)
```bash
cd backend
npm run seed
```

## Monitoring and Maintenance

### Health Checks
The application includes health check endpoints:
- Backend: `http://your-alb-dns/health`
- Frontend: `http://your-alb-dns/health` (nginx health check)

### Logs
View application logs using CloudWatch:
```bash
aws logs describe-log-groups --log-group-name-prefix /ecs/field-service-crm
```

### Scaling
The ECS service can be scaled manually or automatically:
```bash
aws ecs update-service \
    --cluster your-cluster-name \
    --service your-service-name \
    --desired-count 3
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check RDS security group rules
   - Verify database credentials
   - Ensure RDS instance is running

2. **ECR Push Failures**
   - Verify AWS credentials
   - Check ECR repository exists
   - Ensure Docker is running

3. **ECS Service Not Starting**
   - Check CloudWatch logs
   - Verify task definition
   - Check security group rules

4. **Terraform State Issues**
   - Ensure S3 bucket exists for state storage
   - Check AWS permissions
   - Verify Terraform version compatibility

### Logs and Debugging
```bash
# View ECS service events
aws ecs describe-services --cluster your-cluster --services your-service

# View CloudWatch logs
aws logs tail /ecs/field-service-crm --follow

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn your-target-group-arn
```

## Backup and Recovery

### Database Backup
RDS automated backups are enabled by default. Manual snapshots can be created:
```bash
aws rds create-db-snapshot \
    --db-instance-identifier your-db-instance \
    --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)
```

### Application Backup
Application files are stored in S3 with versioning enabled. No additional backup is typically required.

## Security Considerations

1. **Network Security**
   - VPC with private subnets for database
   - Security groups with minimal required access
   - WAF rules for web application protection

2. **Data Security**
   - Encryption at rest for RDS and S3
   - Encryption in transit with TLS
   - Secrets managed through AWS Secrets Manager

3. **Access Control**
   - IAM roles with least privilege principle
   - Cognito for user authentication
   - Role-based access control in application

## Cost Optimization

1. **Instance Right-Sizing**
   - Monitor CloudWatch metrics
   - Use AWS Cost Explorer
   - Consider Reserved Instances for production

2. **Storage Optimization**
   - S3 lifecycle policies
   - RDS storage optimization
   - CloudWatch log retention policies

3. **Auto-Scaling**
   - ECS service auto-scaling
   - Application Load Balancer scaling
   - Database read replicas for read-heavy workloads

## Support and Documentation

- Application logs: CloudWatch Logs
- Infrastructure monitoring: CloudWatch Metrics
- Application performance: AWS X-Ray (if enabled)
- Error tracking: CloudWatch Alarms

For additional support, refer to the main README.md file or contact the development team.