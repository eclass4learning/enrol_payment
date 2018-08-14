define(['jquery'], function($) {

    return {
        checkDiscountCode: function(instanceid, wwwroot) {
            var discountcode = $("#discountcode").val();
            var checkURL = wwwroot + "/enrol/ecommerce/check_discount.php";

            $.ajax({
                url: checkURL,
                data: { 'discountcode': discountcode
                      , 'instanceid': instanceid
                      },
                context: document.body,
                success: function(r) {
                    var response = JSON.parse(r);
                    if (response["success"]) {
                        var discounted_cost = response["discounted_cost"];
                        $("span#localisedcost").text(discounted_cost);
                        $("input[name=amount]").val(discounted_cost);
                    } else {
                        alert("Invalid discount code.");
                    }
                }
            });

        },

        init: function(instanceid,wwwroot) {
            var self = this;
            $("#applydiscount").click(function() {self.checkDiscountCode(instanceid, wwwroot);});
        }
    };
});
