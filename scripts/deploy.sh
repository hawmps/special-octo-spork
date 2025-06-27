#!/bin/bash

# Field Service CRM Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="field-service-crm"

echo -e "${GREEN}🚀 Starting deployment for environment: ${ENVIRONMENT}${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform is not installed${NC}"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Build and push Docker images
build_and_push_images() {
    echo -e "${YELLOW}Building and pushing Docker images...${NC}"
    
    # Get ECR login
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build backend image
    echo "Building backend image..."
    docker build -t $PROJECT_NAME-backend:latest ./backend
    
    # Build frontend image
    echo "Building frontend image..."
    docker build -t $PROJECT_NAME-frontend:latest ./frontend
    
    # Tag and push images (only if ECR repositories exist)
    if aws ecr describe-repositories --repository-names $PROJECT_NAME-backend --region $AWS_REGION &> /dev/null; then
        ECR_REGISTRY=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com
        
        docker tag $PROJECT_NAME-backend:latest $ECR_REGISTRY/$PROJECT_NAME-backend:latest
        docker push $ECR_REGISTRY/$PROJECT_NAME-backend:latest
        
        docker tag $PROJECT_NAME-frontend:latest $ECR_REGISTRY/$PROJECT_NAME-frontend:latest
        docker push $ECR_REGISTRY/$PROJECT_NAME-frontend:latest
        
        echo -e "${GREEN}✅ Images pushed to ECR${NC}"
    else
        echo -e "${YELLOW}⚠️ ECR repositories not found, skipping push${NC}"
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}Deploying infrastructure with Terraform...${NC}"
    
    cd infrastructure/terraform/environments/$ENVIRONMENT
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -out=tfplan
    
    # Apply if plan succeeds
    if [ $? -eq 0 ]; then
        echo -e "${YELLOW}Applying Terraform changes...${NC}"
        terraform apply tfplan
        echo -e "${GREEN}✅ Infrastructure deployed${NC}"
    else
        echo -e "${RED}❌ Terraform plan failed${NC}"
        exit 1
    fi
    
    cd ../../../../
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # Set database connection details from Terraform output or environment
    if [ -f "infrastructure/terraform/environments/$ENVIRONMENT/terraform.tfstate" ]; then
        cd infrastructure/terraform/environments/$ENVIRONMENT
        DB_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "localhost")
        cd ../../../../
    else
        DB_ENDPOINT=${DB_HOST:-localhost}
    fi
    
    # Run migrations
    cd backend
    DB_HOST=$DB_ENDPOINT npm run migrate
    cd ..
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}Performing health check...${NC}"
    
    # Get ALB DNS name from Terraform output
    if [ -f "infrastructure/terraform/environments/$ENVIRONMENT/terraform.tfstate" ]; then
        cd infrastructure/terraform/environments/$ENVIRONMENT
        ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "localhost:3001")
        cd ../../../../
        
        # Wait for service to be ready
        echo "Waiting for service to be ready..."
        for i in {1..30}; do
            if curl -f "http://$ALB_DNS/health" &> /dev/null; then
                echo -e "${GREEN}✅ Service is healthy${NC}"
                return 0
            fi
            echo "Attempt $i/30: Service not ready yet..."
            sleep 10
        done
        
        echo -e "${RED}❌ Health check failed${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠️ Infrastructure not deployed, skipping health check${NC}"
    fi
}

# Main deployment flow
main() {
    echo -e "${GREEN}Field Service CRM Deployment Script${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    echo ""
    
    check_prerequisites
    
    # Build images if Docker is available
    if command -v docker &> /dev/null; then
        build_and_push_images
    fi
    
    deploy_infrastructure
    
    # Run migrations if this is not the first deployment
    if [ "$ENVIRONMENT" != "dev" ] || [ -f ".env" ]; then
        run_migrations
    fi
    
    health_check
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    
    # Display useful information
    echo ""
    echo -e "${YELLOW}Deployment Information:${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    
    if [ -f "infrastructure/terraform/environments/$ENVIRONMENT/terraform.tfstate" ]; then
        cd infrastructure/terraform/environments/$ENVIRONMENT
        ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "Not available")
        echo "Application URL: http://$ALB_DNS"
        cd ../../../../
    fi
}

# Handle script arguments
case $1 in
    "dev"|"staging"|"prod")
        main
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [environment]"
        echo "Environments: dev, staging, prod"
        echo "Example: $0 dev"
        ;;
    *)
        echo -e "${YELLOW}No environment specified, defaulting to 'dev'${NC}"
        ENVIRONMENT="dev"
        main
        ;;
esac