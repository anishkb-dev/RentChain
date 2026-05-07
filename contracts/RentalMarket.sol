// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RentalMarket
/// @notice A trust-less marketplace where owners list houses for rent
///         and tenants pay rent in ETH directly to a smart contract.
///         No middleman, no broker, no central database.
contract RentalMarket {
    struct Property {
        uint256 id;
        address owner;
        string  location;
        string  description;
        uint256 rentPerMonthWei;
        address currentTenant;
        uint256 leaseEnd;     // unix timestamp; 0 means vacant
        bool    isListed;
    }

    uint256 public propertyCount;
    mapping(uint256 => Property) public properties;
    // Pull-payment pattern: owners withdraw collected rent themselves.
    // Avoids re-entrancy risk and failed-transfer DoS.
    mapping(address => uint256) public balances;

    event PropertyListed(uint256 indexed id, address indexed owner, string location, uint256 rentPerMonthWei);
    event PropertyRented(uint256 indexed id, address indexed tenant, uint256 months, uint256 leaseEnd);
    event LeaseEnded(uint256 indexed id);
    event PropertyUnlisted(uint256 indexed id);
    event Withdrawn(address indexed owner, uint256 amount);

    function listProperty(
        string calldata location,
        string calldata description,
        uint256 rentPerMonthWei
    ) external returns (uint256) {
        require(bytes(location).length > 0, "Location required");
        require(rentPerMonthWei > 0, "Rent must be > 0");

        propertyCount += 1;
        uint256 id = propertyCount;

        properties[id] = Property({
            id: id,
            owner: msg.sender,
            location: location,
            description: description,
            rentPerMonthWei: rentPerMonthWei,
            currentTenant: address(0),
            leaseEnd: 0,
            isListed: true
        });

        emit PropertyListed(id, msg.sender, location, rentPerMonthWei);
        return id;
    }

    function rentProperty(uint256 id, uint256 months) external payable {
        Property storage p = properties[id];
        require(p.isListed, "Not listed");
        require(p.owner != msg.sender, "Owner cannot rent own property");
        require(months >= 1 && months <= 12, "Months must be 1-12");
        require(
            p.currentTenant == address(0) || block.timestamp >= p.leaseEnd,
            "Already rented"
        );

        uint256 total = p.rentPerMonthWei * months;
        require(msg.value == total, "Send exact rent amount");

        p.currentTenant = msg.sender;
        p.leaseEnd = block.timestamp + (months * 30 days);
        balances[p.owner] += msg.value;

        emit PropertyRented(id, msg.sender, months, p.leaseEnd);
    }

    function endLease(uint256 id) external {
        Property storage p = properties[id];
        require(msg.sender == p.owner, "Only owner");
        require(p.currentTenant != address(0), "No active lease");
        require(block.timestamp >= p.leaseEnd, "Lease still active");

        p.currentTenant = address(0);
        p.leaseEnd = 0;
        emit LeaseEnded(id);
    }

    function unlist(uint256 id) external {
        Property storage p = properties[id];
        require(msg.sender == p.owner, "Only owner");
        require(p.currentTenant == address(0), "Currently rented");
        p.isListed = false;
        emit PropertyUnlisted(id);
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        balances[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function getAllProperties() external view returns (Property[] memory) {
        Property[] memory all = new Property[](propertyCount);
        for (uint256 i = 1; i <= propertyCount; i++) {
            all[i - 1] = properties[i];
        }
        return all;
    }
}
